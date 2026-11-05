const shopProductBulkService = require('../../services/shopProductBulk.service');

/**
 * GET /api/shop-products/bulk/template?format=xlsx|csv
 *
 * Answers the sample file itself. Generated from the importer's own column list
 * (shopProductBulk.service.COLUMNS), so "the template's headers" and "what the
 * importer accepts" are the same fact and cannot drift.
 *
 * It is sent as an attachment with a plain file name, because the admin is
 * expected to save it, fill it in and upload it back.
 */
const downloadBulkTemplate = async (request, response) => {
    try {
        const format = String(request.query?.format || request.body?.format || 'xlsx').toLowerCase();

        if (format === 'csv') {
            const csv = shopProductBulkService.buildCsvTemplate();
            response.setHeader('Content-Type', 'text/csv; charset=utf-8');
            response.setHeader('Content-Disposition', 'attachment; filename="naai-shop-product-template.csv"');
            return response.status(200).send(csv);
        }

        const buffer = await shopProductBulkService.buildTemplate();
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        response.setHeader('Content-Disposition', 'attachment; filename="naai-shop-product-template.xlsx"');
        // A generated file has no business being cached by a proxy: the header
        // row changes the day a column is added.
        response.setHeader('Cache-Control', 'no-store');
        return response.status(200).send(buffer);
    } catch (error) {
        console.error('DOWNLOAD BULK TEMPLATE ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = downloadBulkTemplate;
