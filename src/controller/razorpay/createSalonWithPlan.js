const { v4: uuidv4 } = require('uuid');  // Add at top
const { salonCreateValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service')
const transactionService = require('../../services/transaction.service')


const createSalonWithPlan = async (request, response) => {
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
        const now = new Date();
        const startDate = now;
        const endDate = new Date(now);

        switch (planType) {
            case "trial_2_months":
                endDate.setDate(endDate.getDate() + 60);
                break;
            case "monthly":
                endDate.setDate(endDate.getDate() + 30);
                break;
            case "quarterly":
                endDate.setDate(endDate.getDate() + 90);
                break;
            default:
                endDate.setDate(endDate.getDate() + 30);
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
            planStartDate: startDate,
            planEndDate: endDate,
            isPlanActive: true,
        });

        if (!salon?.id) {
            return response.status(200).json({
                status: "FAILED",
                message: "Salon creation failed",
            });
        }

        /* ---------------- TRANSACTION ---------------- */

        await transactionService.addTransaction({
            salonId: salon.id, 
            paymentId: paymentId,   // from Razorpay (from frontend)
            razorpayOrderId: orderId, // order id
            amount: totalAmount,
            grandTotal: grandTotal,
            planType: planType,
        });



        //  token generate
        const token = jwt.sign(
            { salonId: salon.id },
            process.env.JWT_SECRET
        );

        /* ---------------- RESPONSE ---------------- */
        return response.status(200).json({
            status: "SUCCESS",
            message: "Salon created successfully",
            salonId: salon.id,
            orderId: orderId,
            paymentId: paymentId,
            token
        });

    } catch (error) {
        console.error(error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = createSalonWithPlan;