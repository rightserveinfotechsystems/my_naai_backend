const shopProductBulkService = require('../../services/shopProductBulk.service');

/**
 * POST /api/shop-products/bulk/undo   { importId }
 *
 * Soft-deletes exactly the products that import CREATED, and marks the import
 * undone. Updated products stay: they existed before the sheet.
 *
 * `importId` is the handle the import answer carries (`data.importId`) — the
 * panel offers "Undo this import" with it straight after the import.
 */
const undoBulkImport = async (request, response) => {
    try {
        const { importId } = request.body || {};
        const result = await shopProductBulkService.undoImport({
            importId,
            adminId: request.admin?.id
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: result.deletedProducts
                ? `Import undone — ${result.deletedProducts} product${result.deletedProducts === 1 ? '' : 's'} removed from the shop`
                : 'Import undone — there was nothing left to remove',
            data: result
        });
    } catch (error) {
        console.error('UNDO BULK IMPORT ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = undoBulkImport;
