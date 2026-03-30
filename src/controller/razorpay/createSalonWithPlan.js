const { salonCreateValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service')
const transactionService = require('../../services/transaction.service');
const { sequelize } = require('../../database/config/db');
const razorpay = require("../../services/razorpay.service");
const { getAdminUserByPhone } = require('../../services/admin.service');
const jwt = require("jsonwebtoken");
const { isPlanActive, getPlanEndDate } = require('../../utils/plan.util');
const db = require('../../database/models');


const createSalonWithPlan = async (request, response) => {
    const t = await sequelize.transaction();
    try {
        const {
            salonName,
            ownerName,
            phoneNumber,
            addressLine1,
            city,
            agentCode,
            genderType,
            latitude,
            longitude,
            planType,
            paymentId,
            orderId,
            totalAmount,
            deviceToken,
            // grandTotal,
            businessHours,
            services
        } = request.body;

        /* ---------------- VALIDATION ---------------- */
        const validationResult = await salonCreateValidationSchema.validate(
            {
                salonName,
                ownerName,
                phoneNumber,
                addressLine1,
                city,
                genderType,
                agentCode,
                latitude,
                longitude,
                planType,
                paymentId,
                orderId,
                totalAmount,
                deviceToken,
                businessHours,
                services
                // grandTotal,
            },
            { abortEarly: true }
        );
        if (validationResult.error) {
            return response.status(200).json({
                status: "FAILED",
                message: validationResult.error.details[0].message,
            });
        }

        /* ---------------- CALCULATE PLAN DATES ---------------- */
        // const planStartDate = new Date();
        // const plans = {  
        //     trial_2_months: 60,
        //     monthly: 30,
        //     quarterly: 90,
        //     yearly: 365
        // }
        // const daysToAdd = plans[planType] ?? 30;
        // const planEndDate = new Date(planStartDate);
        // planEndDate.setDate(planStartDate.getDate() + daysToAdd);
        const planStartDate = new Date();
        const planEndDate = getPlanEndDate(planStartDate, planType);



        let createdBy = null;
        if (agentCode) {
            const isAgentExist = await getAdminUserByPhone(agentCode);
            if (isAgentExist) {
                createdBy = isAgentExist?.id;
            } else {
                //add agent in db
                let agent = await db.Admin.create({
                    mobile: agentCode,
                    name: `Agent_${agentCode}`,
                    email: `${agentCode}@auto.com`,
                    password: "Pass123456",
                    isAdmin: false,
                    isAutoCreated: true,
                    accessTab: []
                }, { transaction: t });

                createdBy = agent?.id;

                //for race condition if two user trying to sae one number at a time 
                // if (agentCode) {
                //     const [agent, created] = await db.Admin.findOrCreate({
                //         where: { mobile: agentCode },
                //         defaults: {
                //             mobile: agentCode,
                //             name: `Agent_${agentCode}`,
                //             email: `${agentCode}@auto.com`,
                //             password: "123456",
                //             isAdmin: false,
                //             isAutoCreated: true,
                //             accessTab: []
                //         },
                //         transaction: t
                //     });

                //     createdBy = agent.id;
                // }
            }
        }

        /* ---------------- CREATE Salon ---------------- */
        const salon = await salonService.createSalon({
            salonName,
            ownerName,
            phoneNumber,
            addressLine1,
            city,
            genderType,
            latitude,
            longitude,
            planType,
            planStartDate,
            planEndDate,
            isPlanActive: true,
            createdBy,
            isActive: true
        }, t);

        // If salon creation failed (no salonId returned), rollback the transaction and send error response
        if (!salon?.salonId) {
            await t.rollback()
            return response.status(200).json({
                status: "FAILED",
                message: "Salon creation failed",
            });
        }

        //create buisnessHours
        await db.BusinessHours.create({
            salonId: salon.salonId,
            openingTime: businessHours.openingTime,
            closingTime: businessHours.closingTime,
            breakStartTime: businessHours.breakStartTime || null,
            breakEndTime: businessHours.breakEndTime || null,
            holidayDays: businessHours.holidayDays || [],
            isOpen: true
        }, { transaction: t });

        //create services        
        if (services && services?.length > 0) {
            const servicesData = services.map(service => ({
                salonId: salon.salonId,
                serviceName: service.serviceName,
                description: service.description || null,
                durationMinutes: service.durationMinutes,
                price: service.price || 0
            }));

            await db.Service.bulkCreate(servicesData, { transaction: t });
        }

        //insert devicetoken
        if (deviceToken) {
            await db.DeviceToken.create({
                salonId: salon.salonId,
                deviceToken
            }, { transaction: t });
        }


        // add payment logs in transaction , also capture the payment automatically
        const value = await razorpay.payments.fetch(paymentId);
        const amount = (value?.amount / 100).toFixed(2);
        const TransactionData = {
            salonId: salon?.salonId ?? null,
            transactionId: value?.id,
            razorpayOrderId: orderId,
            amount,
            description: `${salonName} Register salon`,
            paymentType: value?.method,
            acquirer_data:
                value?.method === "card" ? value?.card : value?.acquirer_data,
        };



        await transactionService.addTransaction(TransactionData, t);
        await razorpay.payments.capture(
            value?.id,
            value?.amount,
            value?.currency
        );

        await t.commit()

        //  token generate
        const token = jwt.sign(
            { salonId: salon?.salonId },
            process.env.JWT_SECRET ?? "secret_key"
        );

        /* ---------------- RESPONSE ---------------- */
        return response.status(200).json({
            status: "SUCCESS",
            message: "Salon created successfully",
            salonId: salon?.salonId,
            token
        });

    } catch (error) {
        console.log("error=>>>", error);
        await t.rollback()
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = createSalonWithPlan;