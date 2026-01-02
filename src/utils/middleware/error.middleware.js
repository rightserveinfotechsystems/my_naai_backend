const multer = require("multer");

module.exports = (err, req, res, next) => {
    // Multer errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    // Custom errors
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }

    next();
};
