const razorpay = require("../../services/razorpay.service");


const captureAuthorizedPayments = async () => {
    try {
        const payments = await razorpay.payments.all({
            from: Date.now() - 1000 * 60 * 60 * 24, // last 24 hrs
            to: Date.now(),
            count: 100,
        });

        const authorizedPayments = payments.items.filter(
            (p) => p.status === "authorized"
        );

        console.log(`Found ${authorizedPayments.length} authorized payments.`);

        for (const p of authorizedPayments) {
            try {
                console.log(`Capturing ${p.id} for ₹${p.amount / 100}`);
                const result = await razorpay.payments.capture(
                    p.id,
                    p.amount,
                    p.currency
                );
                console.log("Captured:", result.id, result.status);
            } catch (err) {
                console.error(`Failed to capture ${p.id}:`, err.message);
            }
        }

        console.log("✅ Capture job completed.");
    } catch (error) {
        console.error("Error fetching payments:", error);
    }
};

module.exports = captureAuthorizedPayments;
