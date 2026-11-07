const { Op, where, literal } = require('sequelize');
const db = require('../database/models');
const categoryRules = require('./shopCategoryRules');

const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT, 10) || 20;
// One page of the shop grid: the website asks for 24, the mobile app keeps the
// server default. Above this a single request would return the whole catalog.
const MAX_LIMIT = 60;


// priceRange ids come straight from the shop's dropdown.
const PRICE_RANGES = {
  under500: { [Op.lt]: 500 },
  '500to1000': { [Op.between]: [500, 1000] },
  over1000: { [Op.gt]: 1000 }
};

const SORTS = {
  'price-asc': [['price', 'ASC'], ['productName', 'ASC']],
  'price-desc': [['price', 'DESC'], ['productName', 'ASC']],
  // "Popular" is the curated order the catalog is browsed in.
  popular: [['rating', 'DESC'], ['createdAt', 'DESC']]
};

const asBool = (value) => value === true || value === 'true' || value === 1 || value === '1';

/**
 * The LIVE category list (`shop_categories`) is the authority for category
 * ids and labels. It is read at request time (with a short cache), so an admin
 * can add or rename a category without requiring a backend deploy.
 *
 * If the table is unavailable (for example, before the migration is deployed),
 * the taxonomy service still recognizes its built-in seed categories.
 */
let categoryCache = { at: 0, rows: [] };
const CATEGORY_TTL_MS = 30 * 1000;

const liveCategories = async () => {
  if (categoryCache.at && Date.now() - categoryCache.at < CATEGORY_TTL_MS) {
    return categoryCache.rows;
  }

  let rows = [];
  try {
    rows = await db.ShopCategory.findAll({
      attributes: ['id', 'label'],
      raw: true
    });
  } catch (error) {
    console.warn('[shop] category list unavailable, using the seed taxonomy:', error.message);
  }

  categoryCache = { at: Date.now(), rows: rows || [] };
  return categoryCache.rows;
};

/**
 * The category filter, EXACTLY.
 *
 * A product's category is the explicit value when it is known, otherwise the
 * keyword inference on its name. The SQL CASE uses the same live category list
 * as resolveCategoryId(), so the WHERE clause, count and page describe the same
 * shelf. Empty or legacy free-text category values are classified consistently.
 */
const categoryWhere = (category, categories = []) => {
  const id = categoryRules.resolveCategoryId(category, { categories });
  if (!id) return null;
  return where(literal(categoryRules.categoryCaseSql({ categories })), '=', id);
};

/**
 * The gender filter, resolved the same way: an explicit MALE/FEMALE/UNISEX wins,
 * otherwise the name's inference, otherwise UNISEX.
 */
const genderWhere = (gender) => {
  const value = categoryRules.resolveGenderValue(gender);
  if (!value) return null;
  return where(literal(categoryRules.genderCaseSql()), '=', value);
};

// The buying side (salon app/web, a mobile user, or the public website with no
// token) browses the catalog. Search, category, gender, price range, stock and
// ordering are all decided HERE, so pagination describes the filtered result.
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
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_LIMIT)
  );
  const parsedPage = parseInt(page, 10);
  const safePage = parsedPage > 0 ? parsedPage : 1;
  const offset = (safePage - 1) * limit;

  const and = [];

  const trimmedSearch = String(searchString || '').trim();
  if (trimmedSearch) {
    and.push({
      [Op.or]: [
        { productName: { [Op.iLike]: `%${trimmedSearch}%` } },
        { description: { [Op.iLike]: `%${trimmedSearch}%` } }
      ]
    });
  }

  const categories = await liveCategories();
  const categoryClause = categoryWhere(category, categories);
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
      // Echo what the server actually applied. The website can use this to
      // distinguish server-filtered pagination from older deployments.
      applied: {
        searchString: trimmedSearch,
        category: categoryRules.resolveCategoryId(category, { categories }) || '',
        gender: String(gender || ''),
        priceRange: String(priceRange || ''),
        sort: SORTS[sortKey] ? sortKey : 'popular',
        inStock: asBool(inStock)
      }
    }
  };
};

const getById = async (productId) => {
  return db.ShopProduct.findOne({ where: { productId, deletedAt: null } });
};

// Admin create — the company adds to its own catalog (no salonId involved).
const create = async (dataToInsert) => {
  return db.ShopProduct.create(dataToInsert);
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
