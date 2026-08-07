const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../../public/uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const extension = path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName + extension);
  },
});

// Image filter
const imageFilter = (req, file, cb) => {
  // Common image MIME types
  const allowedMimeTypes = [
    // JPEG
    "image/jpeg",
    "image/jpg",

    // PNG
    "image/png",

    // WebP
    "image/webp",

    // GIF
    "image/gif",

    // BMP
    "image/bmp",

    // TIFF
    "image/tiff",

    // HEIC / HEIF - iPhone
    "image/heic",
    "image/heif",

    // AVIF
    "image/avif",

    // SVG
    "image/svg+xml",

    // ICO
    "image/x-icon",
    "image/vnd.microsoft.icon",

    // JPEG 2000
    "image/jp2",

    // JPEG XL
    "image/jxl",
  ];

  // Common image extensions
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".tif",
    ".tiff",
    ".heic",
    ".heif",
    ".avif",
    ".svg",
    ".ico",
    ".jp2",
    ".j2k",
    ".jpf",
    ".jpx",
    ".jpm",
    ".mj2",
    ".jxl",
  ];

  const extension = path.extname(file.originalname).toLowerCase();

  const isValidMime = allowedMimeTypes.includes(
    file.mimetype.toLowerCase()
  );

  const isValidExtension = allowedExtensions.includes(extension);

  if (isValidMime || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const uploadImage = multer({
  storage,

  limits: {
    // 2 MB
    fileSize: 2 * 1024 * 1024,
  },

  fileFilter: imageFilter,
});

module.exports = uploadImage;