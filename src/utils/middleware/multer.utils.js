const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../../../public/uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        let ext = path.extname(file.originalname).toLowerCase();

        // Fallback for mobile devices (iOS/Android) when originalname lacks extension
        if (!ext) {
            if (file.mimetype.includes("heic")) ext = ".heic";
            else if (file.mimetype.includes("heif")) ext = ".heif";
            else if (file.mimetype.includes("pdf")) ext = ".pdf";
            else if (file.mimetype.includes("png")) ext = ".png";
            else ext = ".jpg";
        }

        cb(null, `${uniqueName}${ext}`);
    },
});

// Universal Filter for Images (including HEIC/HEIF) and PDFs/Documents
const universalFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();

    // 1. Allowed File Extensions
    const allowedExtensions = [
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg",
        ".heic", ".heif",
        ".pdf", ".doc", ".docx", ".txt"
    ];

    // 2. Allowed MIME Keywords
    const allowedMimeKeywords = [
        "image",
        "pdf",
        "document",
        "msword",
        "officedocument",
        "octet-stream" // Mobile devices often send custom files/HEIC as octet-stream
    ];

    const isValidExt = allowedExtensions.includes(ext) || ext === "";
    const isValidMime = allowedMimeKeywords.some((keyword) => mime.includes(keyword));

    if (isValidExt || isValidMime) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file format! Only images (JPG, PNG, HEIC, WEBP) and document files (PDF) are allowed."));
    }
};

const uploadImage = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB Limit (handles uncompressed HEIC photos & multi-page PDFs)
    fileFilter: universalFileFilter,
});

module.exports = uploadImage;