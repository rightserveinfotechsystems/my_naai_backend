const { Op, fn, col, where } = require('sequelize');
const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
// One page of the shop grid: the website asks for 24, the mobile app keeps the
// server default. Above this a single request would return the whole catalog.
const MAX_LIMIT = 60;

/**
 * Shop catalog service — the company's products that SALONS purchase
 * (table `shop_products`, separate from the salons' customer-facing
 * `products`). The catalog is company-wide: there is no salon scoping.
 */

// The shop's category ids, with the labels an admin may have typed instead of
// the id. Kept in step with the web/mobile taxonomy (src/lib/shopCatalog.js):
// an id and its label must select the same rows, or the same filter would show
// a different shelf on the website and in the app.
const CATEGORY_LABELS = {
  'hair-care': 'hair care',
  'beard-grooming': 'beard & grooming',
  'skin-face': 'skin & face',
  'fragrance': 'fragrance',
  'hair-colour': 'hair colour',
  'tools-equipment': 'tools & equipment',
  'kits-sets': 'kits & sets'
};

const KNOWN_CATEGORY_VALUES = [
  ...Object.keys(CATEGORY_LABELS),
  ...Object.values(CATEGORY_LABELS)
];

// priceRange ids come straight from the shop's dropdown.
const PRICE_RANGES = {
  under500: { [Op.lt]: 500 },
  '500to1000': { [Op.between]: [500, 1000] },
  over1000: { [Op.gt]: 1000 }
};

// The gender column stores MALE/FEMALE/UNISEX; the shop speaks men/women/unisex.
const GENDER_VALUES = { men: 'MALE', women: 'FEMALE', unisex: 'UNISEX' };

const SORTS = {
  'price-asc': [['price', 'ASC'], ['productName', 'ASC']],
  'price-desc': [['price', 'DESC'], ['productName', 'ASC']],
  // "Popular" is the curated order the catalog is browsed in.
  popular: [['rating', 'DESC'], ['createdAt', 'DESC']]
};

const asBool = (value) => value === true || value === 'true' || value === 1 || value === '1';

/**
 * A category is a SUPERSET filter.
 *
 * `category` on this table is optional and free-text ('' = "let the client
 * classify it from the name"), so the server must return every row the
 * client's own classifier could file under the requested category:
 *   - the id, or the label an admin typed instead of the id;
 *   - rows with no category at all;
 *   - rows with text this service does not recognise (an admin's free-text
 *     shelf) — those are mapped by the client's keyword rules.
 * Anything the client then does not classify into the chosen category is
 * dropped there, so the grid can never show a product the filter excludes.
 * Being a superset only costs a little extra paging, never a missing product.
 */
const categoryWhere = (category) => {
  const value = String(category || '').trim().toLowerCase();
  if (!value) return null;
  const wanted = [value, CATEGORY_LABELS[value]].filter(Boolean);
  return {
    [Op.or]: [
      where(fn('lower', col('category')), { [Op.in]: wanted }),
      { category: { [Op.is]: null } },
      { category: '' },
      where(fn('lower', col('category')), { [Op.notIn]: KNOWN_CATEGORY_VALUES })
    ]
  };
};

/**
 * A gender filter keeps the rows whose gender is not set: those are inferred
 * from the product name by the client (the same rule the shop always used), so
 * excluding them here would hide products the user's filter actually matches.
 */
const genderWhere = (gender) => {
  const value = GENDER_VALUES[String(gender || '').trim().toLowerCase()];
  if (!value) return null;
  return {
    [Op.or]: [{ gender: value }, { gender: { [Op.is]: null } }]
  };
};

// The buying side (salon app/web, a mobile user, or the public website with no
// token) browses the catalog. Search, category, gender, price range, stock and
// ordering are all decided HERE, so the list a caller is paging through is the
// list its filters describe — the website used to receive the whole shelf and
// narrow it in the browser, which made pagination a lie.
const listCatalog = async ({
  page = 1,
  pageSize,
  searchString = '',
  category,
  gender,
  priceRange,
  sort = 'popular',
  inStock = false
} = {}) => {
  const requested = parseInt(pageSize, 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_LIMIT));
  const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const offset = (safePage - 1) * limit;

  const and = [];

  const trimmedSearch = String(searchString || '').trim();
  if (trimmedSearch) {
    // The same two fields the client searches, so a term means the same thing
    // before and after the facets ship.
    and.push({
      [Op.or]: [
        { productName: { [Op.iLike]: `%${trimmedSearch}%` } },
        { description: { [Op.iLike]: `%${trimmedSearch}%` } }
      ]
    });
  }

  const categoryClause = categoryWhere(category);
  if (categoryClause) and.push(categoryClause);

  const genderClause = genderWhere(gender);
  if (genderClause) and.push(genderClause);

  const range = PRICE_RANGES[String(priceRange || '').trim()];
  if (range) and.push({ price: range });

  // Out-of-stock products are not shoppable: they are not part of the result
  // set the pagination counts.
  if (asBool(inStock)) and.push({ isAvailable: true });

  const whereClause = { deletedAt: null };
  if (and.length) whereClause[Op.and] = and;

  const sortKey = String(sort || '').trim();
  const order = SORTS[sortKey] || SORTS.popular;

  const { count: totalProducts, rows: products } = await db.ShopProduct.findAndCountAll({
    where: whereClause,
    order,
    limit,
    offset
  });

  return {
    products,
    pagination: {
      page: safePage,
      limit,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit) || 0,
      // Echo of what the server actually applied. The website reads this to
      // know whether it may page the answer (server filtering) or has to read
      // the whole catalog and narrow it locally (an older deployment that
      // ignores these fields).
      applied: {
        searchString: trimmedSearch,
        category: String(category || ''),
        gender: String(gender || ''),
        priceRange: String(priceRange || ''),
        sort: SORTS[sortKey] ? sortKey : 'popular',
        inStock: asBool(inStock)
      }
    }
  };
};

const getById = async (productId) => {
  return await db.ShopProduct.findOne({ where: { productId, deletedAt: null } });
};

// Admin create — the company adds to its own catalog (no salonId involved).
const create = async (dataToInsert) => {
  return await db.ShopProduct.create(dataToInsert);
};

// Admin partial update — only the fields actually sent are touched.
const update = async (productId, dataToUpdate) => {
  const product = await db.ShopProduct.findOne({ where: { productId, deletedAt: null } });
  if (!product) return null;
  await product.update(dataToUpdate);
  return product;
};

// Admin soft delete — cart lines and placed orders keep their snapshots, so
// history never dangles.
const softDelete = async (productId) => {
  const product = await db.ShopProduct.findOne({ where: { productId, deletedAt: null } });
  if (!product) return null;
  await product.update({ deletedAt: new Date() });
  return product;
};

module.exports = {
  listCatalog,
  getById,
  create,
  update,
  softDelete
};
