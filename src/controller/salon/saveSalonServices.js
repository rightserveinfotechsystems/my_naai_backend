const {
    salonServicesSaveValidationSchema,
} = require('../../validations/salon.validation');
const { Service, sequelize } = require('../../database/models');

// Saving a salon's whole menu, and nothing else.
//
// `POST /api/salons/edit-salon-profile` already writes services, but only as part
// of a full profile save: the same request carries the address, the photos, the
// business hours and the barbers, and it rewrites the salon row on the way. A
// partner who only wants to change "Haircut ₹250 → ₹300" therefore re-sends
// everything, and the web portal's menu editor has to keep the whole profile in
// sync to change one number.
//
// This endpoint is deliberately narrow:
//
//   body: { services: [...], removedServiceIds: [...] }
//
//   · the salon is taken from the partner's JWT (`request.salon.salonId`), never
//     from the body, so one salon cannot write another salon's menu;
//   · a service WITH a serviceId is updated, one WITHOUT is created — the same
//     existingServices / newServices split `update-salon` uses, in one list, in
//     the order the partner arranged;
//   · removedServiceIds is a SOFT removal (`is_active = false`), never a DELETE:
//     bookings and queue rows point at the service row, and deleting it would
//     either fail on the foreign key or orphan a customer's history. The customer
//     menu is `WHERE is_active = 1`, so the service still disappears for them;
//   · everything happens in one transaction, so a single bad row leaves the menu
//     exactly as it was — a half-saved menu is worse than a refused save;
//   · the response returns the menu as it is now stored, so the client repaints
//     from the record instead of from its own guess.
//
// Note on `affected`: this does NOT check the number of changed rows. MySQL
// reports 0 changed (but 1 matched) rows when an UPDATE writes identical values,
// so a partner pressing Save without editing anything would be told "invalid
// serviceId" — which is exactly the trap in `update-salon`. Ownership is proved
// up front against the salon's own rows instead.
const MAX_MENU_SIZE = 200;

const asId = value => String(value ?? '').trim();
const asNumber = value => Number(value);

const serviceNameKey = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const saveSalonServices = async (request, response) => {
    const salonId = request.salon?.salonId;

    if (!salonId) {
        return response.status(401).json({
            status: 'FAILED',
            message: 'Salon authentication failed',
        });
    }

    // `unknown(true)`: a client that also sends salonId is not scolded — the
    // token already decided which salon this is, and the field is ignored.
    const { error, value } = salonServicesSaveValidationSchema.validate(request.body || {}, {
        abortEarly: true,
        stripUnknown: false,
    });

    if (error) {
        return response.status(400).json({
            status: 'FAILED',
            message: error.details[0].message.replace(/['"]/g, ''),
        });
    }

    const services = Array.isArray(value.services) ? value.services : [];
    const removedServiceIds = [...new Set((value.removedServiceIds || []).map(asId).filter(Boolean))];

    if (services.length > MAX_MENU_SIZE) {
        return response.status(400).json({
            status: 'FAILED',
            message: `A menu can hold at most ${MAX_MENU_SIZE} services`,
        });
    }

    // Two services with the same name read as one service with two prices on the
    // customer's screen, so the menu is refused as a whole rather than saved in a
    // state nobody can explain later. Case and spacing are ignored on purpose.
    const seenNames = new Map();
    for (const service of services) {
        const key = serviceNameKey(service.serviceName);
        if (!key) continue;
        if (seenNames.has(key)) {
            return response.status(400).json({
                status: 'FAILED',
                message: `Two services are named "${String(service.serviceName).trim()}". Give them different names.`,
            });
        }
        seenNames.set(key, true);
    }

    const transaction = await sequelize.transaction();

    try {
        // What this salon already owns. Every id in the request is checked against
        // this set, which is what keeps a crafted serviceId from editing, or
        // switching off, another salon's service.
        const existing = await Service.findAll({
            where: { salonId },
            attributes: ['serviceId'],
            transaction,
        });
        const ownedIds = new Set(existing.map(row => asId(row.serviceId)));

        for (const service of services) {
            const serviceId = asId(service.serviceId);
            if (serviceId && !ownedIds.has(serviceId)) {
                await transaction.rollback();
                return response.status(400).json({
                    status: 'FAILED',
                    message: `Service ${serviceId} is not on your menu`,
                });
            }
        }

        for (const serviceId of removedServiceIds) {
            if (!ownedIds.has(serviceId)) {
                await transaction.rollback();
                return response.status(400).json({
                    status: 'FAILED',
                    message: `Service ${serviceId} is not on your menu`,
                });
            }
        }

        const keptIds = new Set(services.map(service => asId(service.serviceId)).filter(Boolean));
        const contradiction = removedServiceIds.find(serviceId => keptIds.has(serviceId));
        if (contradiction) {
            await transaction.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: 'A service cannot be saved and removed in the same request',
            });
        }

        for (let index = 0; index < services.length; index += 1) {
            const service = services[index];
            const serviceId = asId(service.serviceId);
            const record = {
                serviceName: String(service.serviceName).trim(),
                price: asNumber(service.price),
                durationMinutes: asNumber(service.durationMinutes),
                description: service.description ? String(service.description).trim() : null,
                displayOrder: Number.isInteger(service.displayOrder) ? service.displayOrder : index,
                // A service that is sent in the list is on the menu: re-saving a
                // previously removed one brings it back instead of silently
                // leaving it invisible.
                isActive: true,
            };

            if (serviceId) {
                await Service.update(record, {
                    where: { serviceId, salonId },
                    transaction,
                });
            } else {
                await Service.create({ ...record, salonId }, { transaction });
            }
        }

        if (removedServiceIds.length > 0) {
            await Service.update(
                { isActive: false },
                { where: { serviceId: removedServiceIds, salonId }, transaction }
            );
        }

        await transaction.commit();

        const menu = await Service.findAll({
            where: { salonId, isActive: true },
            attributes: [
                'serviceId',
                'serviceName',
                'price',
                'durationMinutes',
                'description',
                'displayOrder',
                'isActive',
            ],
            order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Services saved successfully',
            data: {
                salonId,
                services: menu,
                serviceCount: menu.length,
                // Removals are soft, so the partner is not told "deleted".
                removedServiceIds,
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in saveSalonServices:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message,
        });
    }
};

module.exports = saveSalonServices;
