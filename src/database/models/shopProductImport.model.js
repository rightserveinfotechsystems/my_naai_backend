const { DataTypes } = require('sequelize');

/**
 * One spreadsheet import of the shop catalogue — the audit trail behind
 * "Undo this import".
 *
 * A bulk upload writes dozens of products in one go; without a record of which
 * import created which row, undoing a bad sheet means hunting them down by hand.
 * Every product a sheet creates carries this row's id in
 * `shop_products.bulk_import_id`, so the undo is one UPDATE, and `report` keeps
 * the per-row reasons a row was refused (a support call six weeks later needs
 * exactly that, not a memory of the dialog).
 */
module.exports = (sequelize) => {
    const ShopProductImport = sequelize.define('ShopProductImport', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // The admin who pressed Import. Stored as the id the token carried —
        // the account row can change, the audit entry must not.
        adminId: {
            type: DataTypes.STRING(64),
            allowNull: false,
            field: 'admin_id'
        },

        fileName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'file_name'
        },

        // CREATE_ONLY | UPSERT — what the sheet was allowed to do to names that
        // already existed.
        mode: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: 'CREATE_ONLY'
        },

        rowsTotal: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'rows_total'
        },
        rowsCreated: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'rows_created'
        },
        rowsUpdated: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'rows_updated'
        },
        rowsFailed: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'rows_failed'
        },

        // { summary, rows: [{ row, productName, result, errors }] } — only the
        // rows that did NOT simply succeed, so a 1000-row sheet cannot bloat
        // the table with a copy of itself.
        report: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        },

        // Set when the import was undone. Kept (with a time) rather than
        // deleted: "who removed 112 products and when" is the question an audit
        // trail exists to answer.
        undoneAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'undone_at'
        }
    }, {
        tableName: 'shop_product_imports',
        timestamps: true,
        underscored: true
    });

    return ShopProductImport;
};
