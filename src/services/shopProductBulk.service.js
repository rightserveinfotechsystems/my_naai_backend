const ExcelJS = require('exceljs');
const { Op, fn, col, where } = require('sequelize');
const db = require('../database/models');
const shopCategoryService = require('./shopCategory.service');
const { ensureShopSchema } = require('../database/config/ensureShopSchema');

/**
 * Bulk create/update of the shop catalogue from a spreadsheet.
 *
 * The flow the admin panel drives, and the reason it is shaped this way:
 *
 *   1. `buildTemplate('xlsx')` — a real Excel file whose header row is generated
 *      from the SAME column list the importer validates, so the two cannot
 *      drift apart.
 *   2. `importFromFile({ ..., dryRun: true })` — validate and report, write
 *      nothing. The panel always does this first and asks "Import 112?" with the
 *      numbers in hand.
 *   3. `importFromFile({ ..., dryRun: false })` — the same code path with the
 *      writes switched on, ONE TRANSACTION PER ROW. A bad row is reported and
 *      skipped; the other 117 products still land. An all-or-nothing transaction
 *      would make one typo in row 400 destroy an evening's work.
 *   4. `undoImport(id)` — soft-deletes exactly the rows that import created.
 *
 * Every message names the sheet's own column and what to do about it, because
 * the person reading it is looking at Excel, not at this file.
 */

const MAX_ROWS = 1000;
const MAX_LABEL = 2000;
const MODES = ['CREATE_ONLY', 'UPSERT'];
const IMAGE_COLUMNS = ['imageUrl1', 'imageUrl2', 'imageUrl3', 'imageUrl4'];

/**
 * The one column list. `header` is what the template prints AND what the
 * importer matches (by name, not by position — an admin who deletes a column
 * mid-sheet still gets a sensible answer).
 */
const COLUMNS = [
    { key: 'productName', header: 'productName', required: true, width: 34, example: 'Matte Clay Pomade 90g', hint: 'Required. 2–120 characters, unique in the catalogue.' },
    { key: 'category', header: 'category', required: true, width: 20, example: 'hair-care', hint: 'Required. One of the ids from the Categories list (hair-care, tools-equipment, …).' },
    { key: 'gender', header: 'gender', required: false, width: 12, example: 'UNISEX', hint: 'MALE, FEMALE or UNISEX. Defaults to UNISEX.' },
    { key: 'price', header: 'price', required: true, width: 12, example: '449', hint: 'Required. A number, no ₹ symbol. At most 2 decimals.' },
    { key: 'mrp', header: 'mrp', required: false, width: 12, example: '599', hint: 'Optional. The crossed-out price; must be at least the price.' },
    { key: 'description', header: 'description', required: false, width: 48, example: 'Strong hold, matte finish, 90g.', hint: 'Optional. Plain text, up to 2000 characters.' },
    { key: 'rating', header: 'rating', required: false, width: 10, example: '4.5', hint: 'Optional. 0–5, one decimal. Defaults to 0.' },
    { key: 'isAvailable', header: 'isAvailable', required: false, width: 12, example: 'TRUE', hint: 'TRUE or FALSE. Defaults to TRUE (live in the shop).' },
    { key: 'stockCount', header: 'stockCount', required: false, width: 12, example: '40', hint: 'Optional. A whole number, 0 or more.' },
    { key: 'imageUrl1', header: 'imageUrl1', required: false, width: 44, example: 'https://cdn.mynaai.in/shop/clay-pomade.jpg', hint: 'Cover photo. Square 1200×1200 JPG, white background, ≤250 KB.' },
    { key: 'imageUrl2', header: 'imageUrl2', required: false, width: 44, example: '', hint: 'Optional. Second photo.' },
    { key: 'imageUrl3', header: 'imageUrl3', required: false, width: 44, example: '', hint: 'Optional. Third photo.' },
    { key: 'imageUrl4', header: 'imageUrl4', required: false, width: 44, example: '', hint: 'Optional. Fourth photo.' },
    { key: 'barCode', header: 'barCode', required: false, width: 18, example: '8901234567890', hint: 'Optional. Up to 64 characters.' },
    { key: 'hsnCode', header: 'hsnCode', required: false, width: 12, example: '3305', hint: 'Optional. Up to 16 characters.' },
    { key: 'gstPercent', header: 'gstPercent', required: false, width: 12, example: '18', hint: 'Optional. 0–28.' }
];

const REQUIRED_KEYS = COLUMNS.filter((column) => column.required).map((column) => column.key);

// 'Product Name', 'product_name' and 'PRODUCTNAME' all mean `productName`: the
// match strips everything that is not a letter or a digit before comparing.
const keyOfHeader = (header) => String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const HEADER_LOOKUP = COLUMNS.reduce((acc, column) => {
    acc[keyOfHeader(column.key)] = column.key;
    acc[keyOfHeader(column.header)] = column.key;
    return acc;
}, {});
// A couple of names an admin might reasonably type instead of the exact header.
Object.assign(HEADER_LOOKUP, {
    name: 'productName',
    product: 'productName',
    categoryid: 'category',
    priceinr: 'price',
    actualprice: 'mrp',
    maxretailprice: 'mrp',
    available: 'isAvailable',
    instock: 'isAvailable',
    stock: 'stockCount',
    quantity: 'stockCount',
    image: 'imageUrl1',
    imageurl: 'imageUrl1',
    coverimage: 'imageUrl1',
    barcode: 'barCode',
    hsn: 'hsnCode',
    gstrate: 'gstPercent',
    gst: 'gstPercent'
});

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// ------------------------------------------------------------- value parsing

const text = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const isBlank = (value) => !text(value);

/**
 * A number typed into a cell, or the sentence explaining why it is not one.
 * `"₹499"` is the single most common wrong cell, so it gets its own message.
 */
const parseNumber = (value, { field, label, min, max, decimals = 2 } = {}) => {
    const raw = text(value);
    if (!raw) return { value: null };

    const cleaned = raw.replace(/,/g, '');
    if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
        return {
            error: {
                field,
                message: `"${raw}" is not a number — put ${label || 'the value'} in as digits only (no ₹ symbol, no units)`
            }
        };
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) {
        return { error: { field, message: `"${raw}" is not a number` } };
    }
    if (decimals === 0 && !Number.isInteger(parsed)) {
        return { error: { field, message: `"${raw}" must be a whole number` } };
    }
    if (min !== undefined && parsed < min) {
        return { error: { field, message: `"${raw}" is below the minimum (${min})` } };
    }
    if (max !== undefined && parsed > max) {
        return { error: { field, message: `"${raw}" is above the maximum (${max})` } };
    }
    if (decimals !== null && /\.\d{3,}$/.test(cleaned)) {
        return { error: { field, message: `"${raw}" has more than ${decimals} decimals` } };
    }

    return { value: parsed };
};

const parseBoolean = (value) => {
    const raw = text(value).toLowerCase();
    if (!raw) return null;
    if (['true', 'yes', 'y', '1', 'live', 'available', 'in stock'].includes(raw)) return true;
    if (['false', 'no', 'n', '0', 'hidden', 'unavailable', 'out of stock'].includes(raw)) return false;
    return undefined;
};

/**
 * An image cell: an absolute http(s) URL, or a path produced by
 * `/api/upload/upload-image` (the panel pastes exactly that). Anything else is
 * a row error — a broken photo is a blank tile in the shop, and a blank tile
 * looks like the product, not the data, is wrong.
 */
const parseImage = (value) => {
    const raw = text(value);
    if (!raw) return '';
    if (/^https?:\/\/\S+$/i.test(raw)) return raw;
    if (/^\/?uploads\/\S+$/i.test(raw)) return raw.replace(/^\//, '');
    if (/^[\w./-]+\.(jpg|jpeg|png|webp|avif)$/i.test(raw)) return raw;
    return null;
};

// --------------------------------------------------------------- validating

const GENDERS = ['MALE', 'FEMALE', 'UNISEX'];

/**
 * One spreadsheet line -> the fields the catalogue would be written with, or the
 * list of things the admin has to fix.
 */
const validateRow = async (values, { resolveCategory } = {}) => {
    const errors = [];
    const push = (field, message) => errors.push({ field, message });

    const productName = text(values.productName);
    if (!productName) push('productName', 'A product name is required');
    else if (productName.length < 2 || productName.length > 120) push('productName', 'A product name must be 2–120 characters');

    let category = '';
    const rawCategory = text(values.category);
    if (!rawCategory) {
        push('category', 'A category is required — use one of the ids from the template (hair-care, tools-equipment, …)');
    } else {
        const resolved = await resolveCategory(rawCategory);
        if (!resolved) {
            push('category', `Unknown category "${rawCategory}" — use one of the ids from the template (hair-care, tools-equipment, …)`);
        } else {
            category = resolved;
        }
    }

    const price = parseNumber(values.price, { field: 'price', label: 'the price', min: 0 });
    if (price.error) push(price.error.field, price.error.message);
    else if (price.value === null) push('price', 'A price is required');

    const mrp = parseNumber(values.mrp, { field: 'mrp', label: 'the MRP', min: 0 });
    if (mrp.error) push(mrp.error.field, mrp.error.message);
    else if (typeof mrp.value === 'number' && typeof price.value === 'number' && mrp.value < price.value) {
        push('mrp', `The MRP (${mrp.value}) is lower than the price (${price.value}) — swap them or leave the MRP blank`);
    }

    const rating = parseNumber(values.rating, { field: 'rating', label: 'the rating', min: 0, max: 5 });
    if (rating.error) push(rating.error.field, rating.error.message);

    const stockCount = parseNumber(values.stockCount, { field: 'stockCount', label: 'the stock count', min: 0, decimals: 0 });
    if (stockCount.error) push(stockCount.error.field, stockCount.error.message);

    const gstPercent = parseNumber(values.gstPercent, { field: 'gstPercent', label: 'the GST %', min: 0, max: 28 });
    if (gstPercent.error) push(gstPercent.error.field, gstPercent.error.message);

    const gender = text(values.gender).toUpperCase();
    if (gender && !GENDERS.includes(gender)) {
        push('gender', `"${text(values.gender)}" is not a gender — use MALE, FEMALE or UNISEX`);
    }

    const available = parseBoolean(values.isAvailable);
    if (available === undefined) {
        push('isAvailable', `"${text(values.isAvailable)}" is not TRUE or FALSE`);
    }

    const description = text(values.description);
    if (description.length > MAX_LABEL) push('description', `The description is longer than ${MAX_LABEL} characters`);

    const barCode = text(values.barCode);
    if (barCode.length > 64) push('barCode', 'The barcode may be at most 64 characters');
    const hsnCode = text(values.hsnCode);
    if (hsnCode.length > 16) push('hsnCode', 'The HSN code may be at most 16 characters');

    const images = [];
    IMAGE_COLUMNS.forEach((key) => {
        const raw = text(values[key]);
        if (!raw) return;
        const parsed = parseImage(raw);
        if (parsed === null) {
            push(key, `"${raw}" is not a usable photo — paste a full https:// link or the /uploads/… path the uploader returns`);
        } else if (!images.includes(parsed)) {
            images.push(parsed);
        }
    });

    const isAvailable = available === undefined ? true : available;

    return {
        errors,
        data: {
            productName,
            category,
            price: price.value,
            mrp: mrp.value,
            rating: rating.value === null ? 0 : Math.round(rating.value * 10) / 10,
            isAvailable,
            // The same two fields the single-product form writes; the shop reads
            // the first image as the cover.
            productImage: images.length ? images.join(',') : null,
            stockStatus: isAvailable ? 'available' : 'out_of_stock',
            stockCount: stockCount.value,
            barCode: barCode || null,
            hsnCode: hsnCode || null,
            gstPercent: gstPercent.value,
            description: description || null,
            gender: GENDERS.includes(gender) ? gender : 'UNISEX'
        }
    };
};

// ------------------------------------------------------------------ reading

const cellText = (value) => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
        if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
        if (value.text !== undefined) return String(value.text).trim();
        if (value.result !== undefined) return String(value.result).trim();
        if (value.hyperlink !== undefined) return String(value.hyperlink).trim();
        if (value.anchor) return String(value.anchor).trim();
        return '';
    }
    return String(value).trim();
};

/**
 * A CSV line into cells, respecting quoted fields ("Bead Oil, 30ml" is one
 * cell, not two). Small and deliberate: the files come from Excel and Google
 * Sheets, both of which quote correctly.
 */
const parseCsvLine = (line) => {
    const cells = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (quoted) {
            if (char === '"' && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                current += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === ',') {
            cells.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
};

/**
 * Header row + data rows -> `[{ row, values }]`.
 *
 * `row` is the SPREADSHEET's row number (the data starts at 2 because row 1 is
 * the header), because that is the number the admin can find in Excel. An array
 * index would be off by one and impossible to search for.
 */
const rowsFromGrid = (grid) => {
    if (!Array.isArray(grid) || !grid.length) {
        throw fail('The file is empty — download the template and fill it in');
    }

    const headerRow = grid[0] || [];
    const keyByColumn = headerRow.map((header) => HEADER_LOOKUP[keyOfHeader(header)] || null);
    const found = new Set(keyByColumn.filter(Boolean));

    const missing = REQUIRED_KEYS.filter((key) => !found.has(key));
    if (missing.length) {
        const names = missing.map((key) => COLUMNS.find((column) => column.key === key).header);
        throw fail(`The header row is missing ${names.join(', ')} — download the template and keep its first row as it is`);
    }

    const rows = [];
    for (let index = 1; index < grid.length; index += 1) {
        const cells = grid[index] || [];
        const values = {};
        keyByColumn.forEach((key, columnIndex) => {
            if (key) values[key] = cells[columnIndex];
        });
        // A row with nothing in it is not an error — Excel pads sheets with
        // empty rows and the admin should not have to delete them.
        if (Object.values(values).every(isBlank)) continue;
        rows.push({ row: index + 1, values });
    }

    if (!rows.length) throw fail('The sheet has a header but no product rows');
    if (rows.length > MAX_ROWS) {
        throw fail(`This sheet has ${rows.length} rows — the limit is ${MAX_ROWS} per upload. Split it and upload the parts.`);
    }

    return rows;
};

const readSpreadsheet = async ({ buffer, originalname }) => {
    const name = String(originalname || '').toLowerCase();

    if (name.endsWith('.csv')) {
        const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
        const lines = content.split(/\r\n|\n|\r/).filter((line) => line.trim().length);
        const grid = lines.map(parseCsvLine);
        return { rows: rowsFromGrid(grid), sheetName: 'CSV' };
    }

    if (!name.endsWith('.xlsx')) {
        throw fail('That is not an .xlsx or .csv file — download the template and fill it in', 415);
    }

    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(buffer);
    } catch (error) {
        throw fail('That .xlsx could not be read — it may be an old .xls file or password-protected. Save it as .xlsx and try again');
    }

    const sheets = workbook.worksheets || [];
    // The template's first sheet is "Products". Matching by name means an admin
    // who adds a sheet of notes does not break the import.
    const sheet = sheets.find((item) => String(item.name).toLowerCase().includes('product')) || sheets[0];
    if (!sheet) throw fail('The workbook has no worksheets');

    const grid = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells = [];
        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            cells[columnNumber - 1] = cellText(cell.value);
        });
        grid.push(cells);
    });

    return { rows: rowsFromGrid(grid), sheetName: sheet.name };
};

// ------------------------------------------------------------------ writing

/**
 * The template. One sheet for filling in, one worked example, one page of rules
 * in customer language.
 */
const buildTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Naai Shop';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Products');
    sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.width }));

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FF3D2B1F' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2B96B' } };
    header.alignment = { vertical: 'middle' };
    header.height = 22;

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };

    // Per-column notes as a comment, so the rules travel with the sheet.
    COLUMNS.forEach((column, index) => {
        const cell = header.getCell(index + 1);
        cell.note = `${column.required ? 'REQUIRED. ' : ''}${column.hint}${column.example ? `\nExample: ${column.example}` : ''}`;
    });

    const example = workbook.addWorksheet('Example');
    example.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.width }));
    example.getRow(1).font = { bold: true };
    example.addRow(COLUMNS.reduce((row, column) => {
        row[column.key] = column.example || '';
        return row;
    }, {}));
    example.addRow(COLUMNS.reduce((row, column) => {
        row[column.key] = column.key === 'productName'
            ? 'Beard Oil 30ml'
            : column.key === 'category'
                ? 'beard-grooming'
                : column.key === 'price'
                    ? '299'
                    : column.key === 'mrp'
                        ? '399'
                        : column.key === 'description'
                            ? 'Light, non-greasy beard oil with argan and jojoba.'
                            : column.key === 'imageUrl1'
                                ? 'https://cdn.mynaai.in/shop/beard-oil.jpg'
                                : '';
        return row;
    }, {}));

    const rules = workbook.addWorksheet('Instructions');
    rules.columns = [{ width: 118 }];
    const lines = [
        'How to add products in bulk',
        '',
        '1. Fill in the "Products" sheet. Do not rename or delete the first row — it is the header and the upload reads the columns by name.',
        '2. One product per row. Leave a cell empty rather than typing "-" or "N/A".',
        '3. Save the file as .xlsx (or .csv) and upload it. Nothing is written until you confirm the report the panel shows you.',
        '',
        'Rules',
        ...COLUMNS.map((column) => `· ${column.header}${column.required ? ' (required)' : ''} — ${column.hint}`),
        '',
        'Photos',
        'Square 1200 × 1200 px, JPG, white background, 250 KB or smaller. The first photo is the cover; up to four per product.',
        'Upload the photos first (they get a link ending in /uploads/…) and paste that link into imageUrl1…4.',
        '',
        'Limits',
        `At most ${MAX_ROWS} products and 5 MB per upload. There is no limit on how many uploads you make.`,
        'A sheet cannot create a category — add the category in Shop Products → Categories first, then use its id.',
        '',
        'If a row is refused you get the sheet row number, the column and what to do about it. Fix those rows and upload again; the products that already landed are skipped by name, not duplicated.'
    ];
    lines.forEach((line, index) => {
        const row = rules.getRow(index + 1);
        row.getCell(1).value = line;
        if (index === 0) row.font = { bold: true, size: 14 };
        row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};

const buildCsvTemplate = () => `${COLUMNS.map((column) => column.header).join(',')}\r\n`;

// ------------------------------------------------------------------ imports

/** One row's write, in its own transaction. Returns CREATED / UPDATED. */
const writeRow = async ({ data, mode, importId }) => {
    return db.sequelize.transaction(async (transaction) => {
        const existing = await db.ShopProduct.findOne({
            where: { deletedAt: null, [Op.and]: [where(fn('lower', col('product_name')), data.productName.toLowerCase())] },
            transaction
        });

        if (existing) {
            if (mode === 'CREATE_ONLY') return { result: 'SKIPPED', existing };
            await existing.update(data, { transaction });
            return { result: 'UPDATED', productId: existing.productId };
        }

        const created = await db.ShopProduct.create({ ...data, bulkImportId: importId }, { transaction });
        return { result: 'CREATED', productId: created.productId };
    });
};

/**
 * Validate (and optionally write) an uploaded sheet.
 *
 * The answer is always the same shape, dry run or not, so the panel can render
 * one report:
 *
 *   { dryRun, summary: { rows, created, updated, skipped, failed },
 *     rows: [{ row, productName, result, errors?, productId? }] }
 */
const importFromFile = async ({ buffer, originalname, mode = 'CREATE_ONLY', dryRun = false, adminId }) => {
    await ensureShopSchema();

    const safeMode = MODES.includes(String(mode).toUpperCase()) ? String(mode).toUpperCase() : 'CREATE_ONLY';
    const isDryRun = dryRun === true || String(dryRun).toLowerCase() === 'true';

    const { rows, sheetName } = await readSpreadsheet({ buffer, originalname });

    // The category lookup is the same rule the admin panel and the storefront
    // use (id, then label, then the label's slug) — cached per distinct value,
    // because a sheet of 120 rows has about four of them.
    const categoryCache = new Map();
    const resolveCategory = async (value) => {
        const key = String(value).trim().toLowerCase();
        if (!categoryCache.has(key)) {
            categoryCache.set(key, await shopCategoryService.resolveCategoryId(value));
        }
        return categoryCache.get(key);
    };

    let importId = null;
    if (!isDryRun) {
        const record = await db.ShopProductImport.create({
            adminId: String(adminId || 'unknown'),
            fileName: String(originalname || 'upload').slice(0, 255),
            mode: safeMode,
            rowsTotal: rows.length
        });
        importId = record.id;
    }

    const report = {
        dryRun: isDryRun,
        sheetName,
        mode: safeMode,
        summary: { rows: rows.length, created: 0, updated: 0, skipped: 0, failed: 0 },
        rows: []
    };

    // A name that appears twice in one sheet: the second row is refused, so an
    // UPSERT cannot race itself into two products.
    const seenNames = new Map();

    for (const line of rows) {
        const { data, errors } = await validateRow(line.values, { resolveCategory });
        const nameKey = data.productName ? data.productName.toLowerCase() : '';

        if (!errors.length) {
            if (seenNames.has(nameKey)) {
                errors.push({
                    field: 'productName',
                    message: `Duplicate of row ${seenNames.get(nameKey)} in this file — keep one of them`
                });
            } else {
                seenNames.set(nameKey, line.row);
            }
        }

        if (errors.length) {
            report.summary.failed += 1;
            report.rows.push({ row: line.row, productName: data.productName || '', result: 'FAILED', errors });
            continue;
        }

        try {
            if (isDryRun) {
                // Nothing is written, but the panel still needs to know whether
                // this name will be created or skipped — that is the number the
                // confirmation quotes.
                const existing = await db.ShopProduct.findOne({
                    where: { deletedAt: null, [Op.and]: [where(fn('lower', col('product_name')), nameKey)] },
                    attributes: ['productId', 'productName']
                });
                if (existing && safeMode === 'CREATE_ONLY') {
                    report.summary.skipped += 1;
                    report.rows.push({
                        row: line.row,
                        productName: data.productName,
                        result: 'SKIPPED',
                        errors: [{ field: 'productName', message: 'A product with this name already exists' }]
                    });
                } else if (existing) {
                    report.summary.updated += 1;
                    report.rows.push({ row: line.row, productName: data.productName, result: 'UPDATED', productId: existing.productId });
                } else {
                    report.summary.created += 1;
                    report.rows.push({ row: line.row, productName: data.productName, result: 'CREATED' });
                }
                continue;
            }

            const written = await writeRow({ data, mode: safeMode, importId });
            if (written.result === 'SKIPPED') {
                report.summary.skipped += 1;
                report.rows.push({
                    row: line.row,
                    productName: data.productName,
                    result: 'SKIPPED',
                    errors: [{ field: 'productName', message: 'A product with this name already exists' }]
                });
            } else if (written.result === 'UPDATED') {
                report.summary.updated += 1;
                report.rows.push({ row: line.row, productName: data.productName, result: 'UPDATED', productId: written.productId });
            } else {
                report.summary.created += 1;
                report.rows.push({ row: line.row, productName: data.productName, result: 'CREATED', productId: written.productId });
            }
        } catch (error) {
            // One row's transaction is rolled back; the rest of the file keeps
            // going. That is the whole point of per-row transactions.
            console.error(`[shop bulk import] row ${line.row} failed:`, error.message);
            report.summary.failed += 1;
            report.rows.push({
                row: line.row,
                productName: data.productName || '',
                result: 'FAILED',
                errors: [{ field: 'row', message: `Could not save this row (${error.message})` }]
            });
        }
    }

    const wroteSomething = report.summary.created + report.summary.updated > 0;

    if (!isDryRun && importId) {
        if (!wroteSomething) {
            // Nothing landed: an audit entry for an import that did nothing is
            // noise, and "Undo" would be meaningless.
            await db.ShopProductImport.destroy({ where: { id: importId } }).catch(() => {});
            importId = null;
        } else {
            await db.ShopProductImport.update({
                rowsCreated: report.summary.created,
                rowsUpdated: report.summary.updated,
                rowsFailed: report.summary.failed,
                // Only the rows that need attention: a 1000-row sheet must not
                // store a copy of itself as JSON.
                report: {
                    summary: report.summary,
                    mode: safeMode,
                    sheetName,
                    skipped: report.rows.filter((row) => row.result === 'SKIPPED').length,
                    rows: report.rows.filter((row) => row.result !== 'CREATED')
                }
            }, { where: { id: importId } });
        }
    }

    return {
        ok: isDryRun || wroteSomething,
        report: { ...report, importId }
    };
};

/**
 * Undo an import: soft-delete exactly the products it CREATED.
 *
 * A product the import updated is left alone — it existed before the sheet and
 * removing it would delete something the admin made by hand. Soft delete (not
 * DELETE) keeps the cart lines and the placed orders that reference it whole.
 */
const undoImport = async ({ importId, adminId } = {}) => {
    await ensureShopSchema();
    if (!importId) throw fail('An importId is required — it is the "Undo this import" handle the import returned');

    const record = await db.ShopProductImport.findByPk(importId);
    if (!record) throw fail('No import with that id', 404);
    if (record.undoneAt) throw fail('This import was already undone', 400);

    const [deleted] = await db.ShopProduct.update(
        { deletedAt: new Date() },
        { where: { bulkImportId: importId, deletedAt: null } }
    );

    await record.update({ undoneAt: new Date() });

    console.log(`[shop bulk import] import ${importId} undone by admin ${adminId}: ${deleted} product(s) removed from the shop`);

    return { importId, deletedProducts: deleted };
};

module.exports = {
    COLUMNS,
    MAX_ROWS,
    IMAGE_COLUMNS,
    MODES,
    rowsFromGrid,
    parseCsvLine,
    parseNumber,
    parseImage,
    cellText,
    validateRow,
    readSpreadsheet,
    buildTemplate,
    buildCsvTemplate,
    importFromFile,
    undoImport
};
