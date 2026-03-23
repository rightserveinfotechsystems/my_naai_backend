const { renewPlanValidationSchema } = require('../../validations/salon.validation');
const transactionService = require('../../services/transaction.service');
const { sequelize } = require('../../database/config/db');
const razorpay = require("../../services/razorpay.service");
const { isPlanActive, getPlanEndDate } = require('../../utils/plan.util');
const db = require('../../database/models');

const renewSalonPlan = async (request, response) => {
    const t = await sequelize.transaction();

    try {
        const { planType, paymentId, orderId, totalAmount } = request.body;

        /* ---------------- VALIDATION ---------------- */
        const validationResult = renewPlanValidationSchema.validate(
            { planType, paymentId, orderId, totalAmount },
            { abortEarly: true }
        );

        if (validationResult.error) {
            await t.rollback();
            return response.status(400).json({
                status: "FAILED",
                message: validationResult.error.details[0].message,
            });
        }

        /* ---------------- AUTH ---------------- */
        const salonId = request.salon.salonId;

        const salon = await db.Salon.findOne({
            where: { salonId }
        });

        if (!salon) {
            await t.rollback();
            return response.status(404).json({
                status: "FAILED",
                message: "Salon not found",
            });
        }

        /* ---------------- PAYMENT VERIFY ---------------- */
        // const payment = await razorpay.payments.fetch(paymentId);

        // if (!payment || payment.status !== "captured") {
        //     await t.rollback();
        //     return response.status(400).json({
        //         status: "FAILED",
        //         message: "Payment not successful",
        //     });
        // }

        /* ---------------- PLAN LOGIC ---------------- */
        // If plan is active, extend from current end date
        let startDate = new Date();

        if (salon.planEndDate && new Date(salon.planEndDate) > new Date()) {
            startDate = new Date(salon.planEndDate);
        }

        const endDate = getPlanEndDate(startDate, planType);

        
//  otherwise start from today
        // const startDate = new Date();
        // const endDate = getPlanEndDate(startDate, planType);

        /* ---------------- UPDATE SALON ---------------- */
        await salon.update({
            planType,
            planStartDate: startDate,
            planEndDate: endDate,
            totalAmount,
            isPlanActive: isPlanActive(endDate)
        }, { transaction: t });

        /* ---------------- TRANSACTION ---------------- */
        // add payment logs in transaction , also capture the payment automatically
        const value = await razorpay.payments.fetch(paymentId);
        const amount = (value?.amount / 100).toFixed(2);
        const TransactionData = {
            salonId: salon?.salonId ?? null,
            transactionId: value?.id,
            razorpayOrderId: orderId,
            amount,
            planType: planType,
            description: `Renew Plan: ${salon?.salonName}`,
            paymentType: value?.method,
            acquirer_data:
                value?.method === "card" ? value?.card : value?.acquirer_data,
        };



        await transactionService.addTransaction(TransactionData, t);
        // await razorpay.payments.capture(
        //     value?.id,
        //     value?.amount,
        //     value?.currency
        // );

        await t.commit();

        return response.status(200).json({
            status: "SUCCESS",
            message: "Plan renewed successfully",
            data: {
                planType,
                planStartDate: startDate,
                planEndDate: endDate
            }
        });

    } catch (error) {
        console.log("error=>>>", error);
        await t.rollback();

        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = renewSalonPlan;