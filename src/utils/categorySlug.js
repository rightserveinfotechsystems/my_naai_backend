// utils/categorySlug.js
//
// ONE slug rule for a product-category id.
//
// A category's `id` is what a product stores (`shop_products.category`) and
// what the shop's filter sends back, so the same label must produce the same id
// in every place that can create one:
//
//   · the admin panel's Categories manager (src/components/ShopCategoriesModal),
//   · the website's reader (my-naai-web/src/lib/shopCategories.js,
//     `categoryIdFromLabel`) — the two must agree or a category created in one
//     place cannot be selected in the other,
//   · the bulk importer, which may be handed a LABEL where an id belongs.
//
// The rule is deliberately boring: lowercase, `&` becomes `and`, everything
// that is not a letter or a digit becomes a single `-`, then trim the edges.
//
//   "Tools & equipment"  -> "tools-and-equipment"
//   "  Nail care "       -> "nail-care"
//   "Men's grooming"     -> "men-s-grooming"
//
// It is NOT idempotent against the seed ids on purpose: the seven categories
// the shop ships with ("tools-equipment", "kits-sets") were named by hand, so
// the seed is inserted with explicit ids and a rename never re-slugs an
// existing row (products reference the id).
const CATEGORY_ID_MAX = 64;

const toCategoryId = (label = '') => String(label)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_ID_MAX)
    // A trailing '-' can appear after the slice; strip it so the stored id is
    // always clean.
    .replace(/-+$/g, '');

module.exports = { toCategoryId, CATEGORY_ID_MAX };
