#!/usr/bin/env node
// Fills in `shop_products.category` for rows whose value is empty or free text.
//
// The filter (services/shopProduct.service.js) resolves every row from its
// explicit category or, failing that, from its name — so the shop is already
// correct without this. Running it makes the COLUMN say what the filter says:
// the admin panel stops showing a blank shelf, a SQL report counts the same
// shelves the shop does, and the catalog filter becomes a plain index-friendly
// equality instead of a CASE.
//
//   npm run shop:backfill-categories            # dry run: report only
//   npm run shop:backfill-categories -- --apply # write the changes
//
// It only ever touches rows whose category is NOT already one of the taxonomy's
// ids, so it is safe to run twice and it never overwrites an admin's choice.
const { Op } = require('sequelize');
const db = require('../src/database/models');
const rules = require('../src/services/shopCategoryRules');

const APPLY = process.argv.includes('--apply');

const run = async () => {
  const rows = await db.ShopProduct.findAll({
    where: { deletedAt: null },
    attributes: ['productId', 'productName', 'category'],
    order: [['createdAt', 'ASC']]
  });

  const changes = [];
  for (const row of rows) {
    const current = String(row.category || '').trim().toLowerCase();
    if (rules.CATEGORY_IDS.includes(current)) continue; // already an id — leave it
    const resolved = rules.resolveCategory({ category: row.category, productName: row.productName });
    if (resolved === current) continue;
    changes.push({ productId: row.productId, productName: row.productName, from: row.category || '(empty)', to: resolved });
  }

  console.log(`Scanned ${rows.length} product(s); ${changes.length} would change.`);
  for (const change of changes.slice(0, 25)) {
    console.log(`  ${change.productName}: ${change.from} → ${change.to}`);
  }
  if (changes.length > 25) console.log(`  … and ${changes.length - 25} more`);

  if (!APPLY) {
    console.log('\nDry run. Re-run with `-- --apply` to write these changes.');
    return;
  }

  let written = 0;
  for (const change of changes) {
    const [affected] = await db.ShopProduct.update(
      { category: change.to },
      { where: { productId: change.productId } }
    );
    written += affected;
  }
  console.log(`\nUpdated ${written} product(s).`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  });
