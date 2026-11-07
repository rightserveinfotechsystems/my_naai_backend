
const SHOP_CATEGORIES = [
  { id: 'hair-care', label: 'Hair care' },
  { id: 'beard-grooming', label: 'Beard & grooming' },
  { id: 'skin-face', label: 'Skin & face' },
  { id: 'fragrance', label: 'Fragrance' },
  { id: 'hair-colour', label: 'Hair colour' },
  { id: 'tools-equipment', label: 'Tools & equipment' },
  { id: 'kits-sets', label: 'Kits & sets' },
];

const CATEGORY_IDS = SHOP_CATEGORIES.map((category) => category.id);

// Ordered: the FIRST match wins, so specific gear beats a generic "oil" and a
// "beard kit" files under kits-sets. A RegExp entry must match whole words.
const CATEGORY_RULES = [
  ['tools-equipment', ['clipper', 'trimmer', 'straight razor', 'razor', 'shaver', 'comb', 'cape', 'apron', 'towel', 'scissor', 'dryer', 'styler', 'straightener', 'curling iron', 'curler', 'mirror stand']],
  // "pack" stays out: "Colour Pack 100g" is a size descriptor, not a bundle.
  ['kits-sets', ['kit', 'combo', 'bundle', /(^|[^a-z])sets?([^a-z]|$)/i]],
  ['fragrance', ['perfume', 'deodorant', 'deo', 'cologne', 'attar']],
  ['hair-colour', ['colour', 'color', 'henna', 'dye', 'greys']],
  ['beard-grooming', ['beard', 'mustache', 'stubble', 'pomade']],
  ['skin-face', ['face', 'skin', 'sunscreen', 'spf', 'moisturiser', 'moisturizer', 'lotion', 'toner', 'cleanser', 'scrub', 'face mask', 'glow', 'brow', 'lashes', 'lip']],
  ['hair-care', ['shampoo', 'conditioner', 'serum', 'oil', 'spa', 'keratin', 'gel', 'hairspray', 'hair spray', 'hair mask', 'balm', 'butter', 'treatment', 'fall control', 'fall', 'scalp', 'hair']],
];

// Where a name that matches no rule at all belongs — the broadest shelf, which
// is what the storefront has always done.
const DEFAULT_CATEGORY = 'hair-care';

// The shop's control says men/women/unisex; the column stores MALE/FEMALE/UNISEX.
// Both vocabularies resolve, so a filter and a product can never be speaking
// different languages.
const GENDER_VALUES = {
  men: 'MALE',
  male: 'MALE',
  m: 'MALE',
  women: 'FEMALE',
  woman: 'FEMALE',
  female: 'FEMALE',
  f: 'FEMALE',
  unisex: 'UNISEX',
  all: 'UNISEX',
  both: 'UNISEX',
  family: 'UNISEX'
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

// Labels can carry a double space (\"Waxing  products\") and the stored column
// may carry it too; comparing the collapsed form is what makes the two match.
const normalizeValue = (value) => normalizeText(value).replace(/\s+/g, ' ');

const normalizeCategories = (categories) => (Array.isArray(categories) ? categories : [])
    .map((category) => ({
        id: String(category?.id ?? '').trim(),
        label: String(category?.label ?? '').trim()
    }))
    .filter((category) => category.id);

const escapeLike = (value) => String(value).replace(/[\\%_]/g, (match) => `\\${match}`);

function keywordMatches(text, keyword) {
  if (keyword instanceof RegExp) return keyword.test(text);
  return text === keyword || text.includes(keyword);
}

/** The category a product NAME classifies into (first rule wins). */
function inferCategory(name) {
  const text = normalizeText(name);
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((keyword) => keywordMatches(text, keyword))) return category;
  }
  return DEFAULT_CATEGORY;
}

// An id-shaped value: "hair-care", "shaving", "beard-oils". The admin panel
// creates a category with a slug like this and files products under it, so an
// explicit slug that is not in THIS build's list is still a category of its own
// — keeping it is what lets a newly added category be filtered before the next
// deploy, on both sides of the API.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * An explicit category value — an id, a label, or the free text an older admin
 * record may carry ("Hair Colour and Chemical Products") — as a category id.
 * Returns '' when the value says nothing this taxonomy recognises.
 */
function resolveCategoryId(value, { categories } = {}) {
  const text = normalizeValue(value);
  if (!text) return '';

  // The LIVE list first. This is the fix for the category that exists in the
  // admin panel and shows nothing in the shop: an admin can rename a category
  // (\"Fragrance\" — \"Waxing products\"), and a product filed before the write guard
  // refuses labels still carries that label in `shop_products.category`. The
  // admin's product count resolves a stored label to its category, so the shop
  // must resolve it the same way or the number on the tab and the shelf behind
  // it describe two different catalogues.
  const live = normalizeCategories(categories);
  const liveHit = live.find(
    (category) => normalizeValue(category.id) === text || normalizeValue(category.label) === text
  );
  if (liveHit) return liveHit.id;

  const direct = SHOP_CATEGORIES.find(
    (category) => category.id === text || normalizeValue(category.label) === text
  );
  if (direct) return direct.id;
  if (SLUG_PATTERN.test(text)) return text; // an admin's newer category
  const rule = CATEGORY_RULES.find(([, keywords]) => keywords.some((keyword) => keywordMatches(text, keyword)));
  return rule ? rule[0] : '';
}

/**
 * The category of a row, with the same precedence the storefront uses: the
 * explicit value when it resolves, otherwise the name's inference. Always one of
 * CATEGORY_IDS, never ''.
 */
function resolveCategory({ category, productName } = {}, options = {}) {
  return resolveCategoryId(category, options) || inferCategory(productName);
}

/** The gender a NAME implies, as the column stores it ('' when it implies none). */
const GENDER_MEN_RULES = ['beard', 'mustache', 'stubble', 'pomade', "men's", 'for men', 'groom', 'barber'];
const GENDER_WOMEN_RULES = ['women', 'woman', 'ladies', 'bridal', 'lashes', 'lipstick', "women's", 'for women'];

function inferGender(name) {
  const text = normalizeText(name);
  if (!text) return '';
  if (text.includes('unisex') || text.includes('family')) return 'UNISEX';
  const men = GENDER_MEN_RULES.some((word) => text.includes(word));
  const women = GENDER_WOMEN_RULES.some((word) => text.includes(word));
  if (men && !women) return 'MALE';
  if (women && !men) return 'FEMALE';
  if (men && women) return 'UNISEX';
  return '';
}

/** An explicit gender value as the column stores it ('' when unrecognised). */
function resolveGenderValue(value) {
  return GENDER_VALUES[normalizeText(value)] || '';
}

function resolveGender({ gender, productName } = {}) {
  return resolveGenderValue(gender) || inferGender(productName) || 'UNISEX';
}

// A row's resolved category, as a Postgres CASE expression built from the rules
// above. Used in WHERE so the COUNT and the page are the same list; the strings
// are all from this file (never from a request), so nothing here is injectable.

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const nameLike = (keyword, column) => {
  if (keyword instanceof RegExp) return `lower(${column}) ~* ${quote(keyword.source)}`;
  return `lower(${column}) LIKE ${quote(`%${escapeLike(keyword)}%`)}`;
};

const anyKeyword = (keywords, column) => `(${keywords.map((keyword) => nameLike(keyword, column)).join(' OR ')})`;

/**
 * `CASE WHEN … END` mapping a shop_products row to one of CATEGORY_IDS.
 * Precedence, exactly like `resolveCategory`:
 *   1. an explicit value that is already an id (a slug) or a label;
 *   2. an explicit value that is free text the keyword rules recognise
 *      ("Hair Colour and Chemical Products" — hair-colour);
 *   3. the product name, first rule wins;
 *   4. DEFAULT_CATEGORY.
 */
function categoryCaseSql({ categoryColumn = 'category', nameColumn = 'product_name', categories } = {}) {
  const whens = [];
  const lowerCategory = `lower(regexp_replace(btrim(coalesce(${categoryColumn}, '')), '[[:space:]]+', ' ', 'g'))`;

  // 0. The LIVE categories, id and current label. First, because a renamed
  //    category's label is what legacy rows actually contain — and because a
  //    label the admin typed must never be re-filed into a different shelf than
  //    the one the panel shows the product under.
  for (const category of normalizeCategories(categories)) {
    whens.push(`WHEN ${lowerCategory} = ${quote(normalizeValue(category.id))} THEN ${quote(category.id)}`);
    whens.push(`WHEN ${lowerCategory} = ${quote(normalizeValue(category.label))} THEN ${quote(category.id)}`);
  }

  // 1a. a value that is already a category id — this build's, or one the admin
  // added after it — stands for itself.
  whens.push(`WHEN ${lowerCategory} ~ ${quote(SLUG_PATTERN.source)} THEN ${lowerCategory}`);

  // 1b. a label ("Hair care", "Tools & equipment") stands for its id.
  for (const category of SHOP_CATEGORIES) {
    whens.push(`WHEN ${lowerCategory} = ${quote(normalizeValue(category.label))} THEN ${quote(category.id)}`);
  }

  // 2. free text on the category column, by keyword, first rule wins.
  CATEGORY_RULES.forEach(([category, keywords], index) => {
    const positive = anyKeyword(keywords, `coalesce(${categoryColumn}, '')`);
    const earlier = CATEGORY_RULES.slice(0, index).flatMap(([, earlierKeywords]) => earlierKeywords);
    const notEarlier = earlier.length ? `NOT ${anyKeyword(earlier, `coalesce(${categoryColumn}, '')`)}` : 'TRUE';
    whens.push(`WHEN ${positive} AND ${notEarlier} THEN ${quote(category)}`);
  });

  // 3. the name, by keyword, first rule wins.
  CATEGORY_RULES.forEach(([category, keywords], index) => {
    const positive = anyKeyword(keywords, nameColumn);
    const earlier = CATEGORY_RULES.slice(0, index).flatMap(([, earlierKeywords]) => earlierKeywords);
    const notEarlier = earlier.length ? `NOT ${anyKeyword(earlier, nameColumn)}` : 'TRUE';
    whens.push(`WHEN ${positive} AND ${notEarlier} THEN ${quote(category)}`);
  });

  return `CASE ${whens.join(' ')} ELSE ${quote(DEFAULT_CATEGORY)} END`;
}

/**
 * The same idea for gender: an explicit value, else what the name implies, else
 * UNISEX. Shops filter on "men / women / unisex" the way the storefront shows it,
 * so the count has to be computed from the resolved value too.
 */
function genderCaseSql({ genderColumn = 'gender', nameColumn = 'product_name' } = {}) {
  const whens = [
    `WHEN ${genderColumn} IS NOT NULL THEN ${genderColumn}::text`,
  ];
  const nameText = `lower(${nameColumn})`;
  const any = (words) => `(${words.map((word) => `${nameText} LIKE ${quote(`%${word}%`)}`).join(' OR ')})`;
  whens.push(`WHEN ${nameText} LIKE '%unisex%' OR ${nameText} LIKE '%family%' THEN 'UNISEX'`);
  whens.push(`WHEN ${any(GENDER_MEN_RULES)} AND NOT ${any(GENDER_WOMEN_RULES)} THEN 'MALE'`);
  whens.push(`WHEN ${any(GENDER_WOMEN_RULES)} AND NOT ${any(GENDER_MEN_RULES)} THEN 'FEMALE'`);
  whens.push(`WHEN ${any(GENDER_MEN_RULES)} AND ${any(GENDER_WOMEN_RULES)} THEN 'UNISEX'`);
  return `CASE ${whens.join(' ')} ELSE 'UNISEX' END`;
}

module.exports = {
  SHOP_CATEGORIES,
  CATEGORY_IDS,
  CATEGORY_RULES,
  DEFAULT_CATEGORY,
  GENDER_VALUES,
  normalizeText,
  normalizeValue,
  inferCategory,
  inferGender,
  resolveCategoryId,
  resolveCategory,
  resolveGender,
  resolveGenderValue,
  categoryCaseSql,
  genderCaseSql
};
