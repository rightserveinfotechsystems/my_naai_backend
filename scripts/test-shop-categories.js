#!/usr/bin/env node
// Guards the shop's category/gender classification, and its parity with the web.
//
// The catalog filter is a SQL CASE built from these rules (services/
// shopCategoryRules.js), and the website classifies a product with its own copy
// of the same table (src/lib/shopCatalog.js in the web repo). If the two drift,
// a filtered page contains fewer cards than its own count promises — the exact
// "2 products, load more 88" report. This script pins the shared table; the web
// repo pins the same rows in src/lib/shopCatalog.test.js, so a rule added on one
// side fails on the other.
//
//   npm run shop:test-categories
const assert = require('assert');
const rules = require('../src/services/shopCategoryRules');

// Keep in step with PARITY in my-naai-web/src/lib/shopCatalog.test.js.
const PARITY = [
  ['Keratin Repair Shampoo 200ml', 'hair-care'],
  ['Matte Clay Pomade 90g', 'beard-grooming'],
  ['Beard Oil 30ml', 'beard-grooming'],
  ['Beard Trimmer Pro', 'tools-equipment'],
  ['Hair Clipper 2200', 'tools-equipment'],
  ['Argan Hair Serum 100ml', 'hair-care'],
  ['Henna Hair Colour Pack', 'hair-colour'],
  ['Sandalwood Perfume 50ml', 'fragrance'],
  ['Face Cleanser for Oily Skin', 'skin-face'],
  ['Hair Spa Ritual Kit', 'kits-sets'],
  ['Salon Cape & Apron Set', 'tools-equipment'],
  ['Castor Hair Oil 200ml', 'hair-care'],
  ['Mystery Ritual', 'hair-care']
];

let failures = 0;
const check = (label, actual, expected) => {
  try {
    assert.deepStrictEqual(actual, expected);
  } catch {
    failures += 1;
    console.error(`  ✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

console.log('Category, from the product name:');
for (const [name, category] of PARITY) check(name, rules.inferCategory(name), category);
console.log(`  ✓ ${PARITY.length} names`);

console.log('Category, from an explicit value:');
for (const [value, expected] of [
  ['hair-care', 'hair-care'],
  ['HAIR-CARE', 'hair-care'],
  ['Hair care', 'hair-care'],
  ['Tools & equipment', 'tools-equipment'],
  ['Hair Colour and Chemical Products', 'hair-colour'],
  ['shaving', 'shaving'], // a category the admin added after this build
  ['', ''],
  ['nonsense value', '']
]) {
  check(JSON.stringify(value), rules.resolveCategoryId(value), expected);
}

console.log('  ✓ explicit values\nGender:');
for (const [name, expected] of [
  ['Beard Oil 30ml', 'MALE'],
  ['Ladies Hair Spa', 'FEMALE'],
  ['Unisex Comb', 'UNISEX'],
  ['Shampoo', 'UNISEX']
]) {
  check(name, rules.resolveGender({ productName: name }), expected);
}
check('explicit MALE wins', rules.resolveGender({ productName: 'Ladies Spa Kit', gender: 'MALE' }), 'MALE');
check('the shop vocabulary resolves', rules.resolveGenderValue('men'), 'MALE');
console.log('  ✓ gender');

console.log('SQL shape:');
const categorySql = rules.categoryCaseSql();
check('balanced parentheses', (categorySql.match(/\(/g) || []).length, (categorySql.match(/\)/g) || []).length);
check('no unbalanced quotes', (categorySql.match(/'/g) || []).length % 2, 0);
check('starts with CASE', categorySql.startsWith('CASE '), true);
check('ends with END', categorySql.endsWith(' END'), true);
check(
  'quotes are escaped in the SQL',
  rules.categoryCaseSql({ categoryColumn: "x' OR 1=1 --" }).includes("''"),
  true
);

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('  ✓ SQL\n\nAll shop category checks passed.');
