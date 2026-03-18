const razorpay = require("../../services/razorpay.service");

const createPaymentOrder = async (request, response) => {
    try {
        const { amount } = request.body;

        const options = {
            amount: amount * 100, // in paise
            currency: "INR",
            receipt: "receipt_" + Date.now(),
            payment_capture: 1, // <---- this automatically captures payment
        };

        const order = await razorpay.orders.create(options);
        if (order) {
            response.status(200).json({
                status: "SUCCESS",
                message: "Order created successfully",
                order
            });
            return;

        } else {
            response.status(200).json({
                status: "FAILED",
                message: "Some error occured while creating Payment order",
            });
            return;
        }
    } catch (error) {
        return response.status(500).json({
            status: "FAILED",
            message: error.message
        })
    }
};


module.exports = createPaymentOrder