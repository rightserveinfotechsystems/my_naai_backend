const crypto = require("crypto");
const db = require("../../database/models");

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            phoneNumber,
            planType
        } = req.body;

        // 🔴 1. Basic validation
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                status: "FAILED",
                message: "Payment details missing"
            });
        }

        // 🔐 2. Signature verify (MOST IMPORTANT)
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZOR_PAY_SECRET_KEY)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid payment signature"
            });
        }

        // 🔴 3. Duplicate payment check (IMPORTANT)
        const existing = await db.Transaction.findOne({
            where: {
                transactionId: razorpay_payment_id
            }
        });

        if (existing) {
            return res.status(400).json({
                status: "FAILED",
                message: "Payment already processed"
            });
        }

        // 🧱 4. Plan config (fix in backend)
        const plans = {
            trial: { price: 129, days: 60 },
            monthly: { price: 99, days: 30 },
            quarterly: { price: 249, days: 90 }
        };

        const selectedPlan = plans[planType];

        if (!selectedPlan) {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid plan"
            });
        }

        // 📅 5. Plan dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + selectedPlan.days);

        // 💾 6. Save transaction
        await db.Transaction.create({
            amount: selectedPlan.price,
            paymentType: "online",
            transactionId: razorpay_payment_id,
            description: planType
        });

        // 🏪 7. Create Salon (IMPORTANT)
        await db.Salon.create({
            phoneNumber,
            planType,
            planStartDate: startDate,
            planEndDate: endDate,
            isActive: true
        });

        return res.status(200).json({
            status: "SUCCESS",
            message: "Payment verified & salon created"
        });

    } catch (error) {
        return res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

module.exports = verifyPayment;