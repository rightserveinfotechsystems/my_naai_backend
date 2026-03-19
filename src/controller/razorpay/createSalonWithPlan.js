const { salonCreateValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service')
const transactionService = require('../../services/transaction.service');
const { sequelize } = require('../../database/config/db');
const razorpay = require("../../services/razorpay.service");
const { getAdminUserByPhone } = require('../../services/admin.service');
const jwt = require("jsonwebtoken")


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
            grandTotal,
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
                grandTotal,
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
        const planStartDate = new Date();
        const plans = {
            trial_2_months: 60,
            monthly: 30,
            quarterly: 90,
            yearly: 365
        }
        // const planEndDate = new Date(plans[planType] ?? 30);
        const daysToAdd = plans[planType] ?? 30;

        const planEndDate = new Date(planStartDate);
        planEndDate.setDate(planStartDate.getDate() + daysToAdd);



        let createdBy = null;
        //check the agent is present by agent code
        // if (agentCode) {
        //     const isAgentExist = await getAdminUserByPhone(agentCode);
        //     createdBy = isAgentExist.id;
        // }

        if (agentCode) {
            const isAgentExist = await getAdminUserByPhone(agentCode);
            if (isAgentExist) {
                createdBy = isAgentExist.id;
            } else {
                // if user not found
                await t.rollback();
                return response.status(200).json({
                    status: "FAILED",
                    message: "Invalid agent code",
                });
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


        if (!salon?.salonId) {
            t.rollback()
            return response.status(200).json({
                status: "FAILED",
                message: "Salon creation failed",
            });
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
            { salonId: salon.id },
            process.env.JWT_SECRET ?? "secretkey"
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