const shopProductBulkService = require('../../services/shopProductBulk.service');

/**
 * POST /api/shop-products/bulk/import  (multipart/form-data)
 *
 *   file    .xlsx | .csv, ≤ 5 MB, ≤ 1000 rows   (required)
 *   mode    CREATE_ONLY | UPSERT                (default CREATE_ONLY)
 *   dryRun  true | false                        (default false)
 *
 * `dryRun: true` validates and reports, writes nothing — the admin panel always
 * calls it first and only then asks "Import 112?".
 *
 * `status` stays SUCCESS when at least one row was written, with the problematic
 * rows in `data.rows`; when nothing could be written the answer is FAILED and
 * still carries the same report, because the report IS the answer.
 */
const bulkImportShopProducts = async (request, response) => {
    try {
        const file = request.file;
        if (!file || !file.buffer) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'No file received — attach the spreadsheet in the "file" field'
            });
        }

        const { mode, dryRun } = request.body || {};
        const { ok, report } = await shopProductBulkService.importFromFile({
            buffer: file.buffer,
            originalname: file.originalname,
            mode,
            dryRun,
            adminId: request.admin?.id
        });

        const { rows, created, updated, skipped, failed } = report.summary;
        const message = report.dryRun
            ? `${created} to add · ${updated} to update · ${skipped} already exist · ${failed} need fixing`
            : `${created} added · ${updated} updated · ${skipped} skipped · ${failed} failed (of ${rows} rows)`;

        return response.status(200).json({
            status: ok ? 'SUCCESS' : 'FAILED',
            message,
            data: report
        });
    } catch (error) {
        console.error('BULK IMPORT SHOP PRODUCTS ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = bulkImportShopProducts;
