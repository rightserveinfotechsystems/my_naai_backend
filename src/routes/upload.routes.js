const express = require("express");
const uploadImage = require("../utils/middleware/multer.utils");
const { uploadImageController } = require("../controller/upload.controller");
const multer = require("multer");


const ImageRoutes = express.Router();

// Middleware to catch Multer and File Filter errors gracefully
const handleFileUpload = (req, res, next) => {
    const upload = uploadImage.single("image");

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Handle Multer-specific errors
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size is too large! Maximum allowed limit is 25MB.",
                });
            }
            if (err.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(400).json({
                    success: false,
                    message: `Unexpected field name '${err.field}'. Form field name must be 'image'.`,
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`,
            });
        } else if (err) {
            // Handle fileFilter format errors
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file format.",
            });
        }

        next(); // Proceed to controller
    });
};

ImageRoutes.post(
    "/upload-image",
    handleFileUpload,
    uploadImageController
);

module.exports = ImageRoutes;
