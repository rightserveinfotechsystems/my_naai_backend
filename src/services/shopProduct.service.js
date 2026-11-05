const { Op, where, literal } = require('sequelize');
const db = require('../database/models');
const categoryRules = require('./shopCategoryRules');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
// One page of the shop grid: the website asks for 24, the mobile app keeps the
// server default. Above this a single request would return the whole catalog.
const MAX_LIMIT = 60;

/**
 * Shop catalog service — the company's products that SALONS purchase
 * (table `shop_products`, separate from the salons' customer-facing
 * `products`). The catalog is company-wide: there is no salon scoping.
 */

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
 * The category filter, EXACTLY.
 *
 * A product's category is the explicit value when it is known, otherwise the
 * keyword inference on its name — the same precedence the storefront uses, and
 * the same table (src/services/shopCategoryRules.js). The SQL CASE that resolves
 * it is what the WHERE clause compares against, so:
 *
 *   · `totalProducts` counts the shelf the user asked for, not the catalogue;
 *   · page N of a filtered query is page N of THAT list — "Show more" can no
 *     longer promise 88 products under a category that holds 2;
 *   · rows whose `category` column is empty or free text are still found, under
 *     the shelf their name proves they belong to.
 *
 * It used to be a superset (id, label, empty and unrecognised rows alike) so the
 * client could classify what the server could not. That made the pagination a
 * lie: the count described the whole catalogue while the grid applied the
 * client's own rules to it.
 */
const categoryWhere = (category) => {
  const id = categoryRules.resolveCategoryId(category);
  if (!id) return null;
  return where(literal(categoryRules.categoryCaseSql()), '=', id);
};

/**
 * The gender filter, resolved the same way: an explicit MALE/FEMALE/UNISEX wins,
 * otherwise the name's inference, otherwise UNISEX. The shop's "men / women /
 * unisex" therefore counts exactly what it shows.
 */
const genderWhere = (gender) => {
  const value = categoryRules.resolveGenderValue(gender);
  if (!value) return null;
  return where(literal(categoryRules.genderCaseSql()), '=', value);
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
