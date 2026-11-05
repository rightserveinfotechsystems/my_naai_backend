// utils/middleware/bulkUpload.middleware.js
//
// The spreadsheet upload for the shop catalogue: `multipart/form-data` with one
// `.xlsx` or `.csv` file in the field `file`.
//
// Kept in memory rather than on disk on purpose — the file is at most 5 MB, it
// is read once and thrown away, and a public/uploads folder full of customers'
// spreadsheets is a data-protection problem nobody asked for.
//
// Multer's own errors (too big, wrong type, no file) are translated here into
// the house envelope with a status code that says what happened, because
// "Something went wrong" is useless to somebody holding a 6 MB sheet.
const multer = require('multer');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — the limit the panel prints

const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];
// Browsers are inconsistent about spreadsheet MIME types (Windows sends
// application/vnd.ms-excel for a .csv), so the extension is the gate and the
// MIME type only a hint.
const ALLOWED_MIME_HINTS = [
    'spreadsheetml',
    'ms-excel',
    'csv',
    'text/plain',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/octet-stream'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    fileFilter: (_request, file, callback) => {
        const name = String(file.originalname || '').toLowerCase();
        const extension = name.slice(name.lastIndexOf('.'));
        const mime = String(file.mimetype || '').toLowerCase();
        const extensionOk = ALLOWED_EXTENSIONS.includes(extension);
        const mimeOk = ALLOWED_MIME_HINTS.some((hint) => mime.includes(hint));

        if (extensionOk && mimeOk) return callback(null, true);
        if (extensionOk && !mime) return callback(null, true);

        return callback(Object.assign(
            new Error(`"${file.originalname}" is not a spreadsheet — upload an .xlsx or .csv file (max 5 MB)`),
            { status: 415 }
        ));
    }
});

/**
 * Accept ONE file in `file`, then answer in the house envelope for anything
 * multer itself refuses.
 */
const bulkUpload = (request, response, next) => {
    upload.single('file')(request, response, (error) => {
        if (!error) return next();

        if (error.code === 'LIMIT_FILE_SIZE') {
            return response.status(413).json({
                status: 'FAILED',
                message: 'That file is larger than 5 MB — split the sheet into smaller ones (5 MB / 1000 rows per upload)'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Upload one file at a time, in the "file" field'
            });
        }
        return response.status(error.status || 400).json({
            status: 'FAILED',
            message: error.message
        });
    });
};

module.exports = { bulkUpload, MAX_FILE_BYTES, ALLOWED_EXTENSIONS };
