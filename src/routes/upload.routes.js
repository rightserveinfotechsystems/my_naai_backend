const express = require("express");
const uploadImage = require("../utils/middleware/multer.utils");
const { uploadImageController } = require("../controller/upload.controller");


const ImageRoutes = express.Router();

ImageRoutes.post(
    "/upload-image",
    uploadImage.single("image"),
    uploadImageController
);



module.exports = ImageRoutes;
