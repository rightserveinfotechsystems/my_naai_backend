const { Op } = require('sequelize');
const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

/**
 * Add a new product
 */
const createProduct = async (productData) => {
  try {
    const product = await db.Product.create(productData);
    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Get product by ID
 */
const getProductById = async (productId) => {
  try {
    const product = await db.Product.findByPk(productId);
    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Update product
 */
const updateProduct = async (productId, salonId, updateData) => {
  try {
    const product = await db.Product.findOne({
      where: {
        productId,
        salonId
      }
    });

    if (!product) {
      return null;
    }

    await product.update(updateData);
    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete product
 */
const deleteProduct = async (productId) => {
  try {
    const product = await db.Product.findByPk(productId);
    if (!product) {
      return null;
    }

    // Soft delete: isDeleted = true
    await product.update({ isDeleted: true });
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * List products with pagination & filters
 */
/**
 * Get users list with pagination
 */

const listProducts = async ({ page = 1, searchString = '' }) => {
  try {
    const limit = DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * limit;

    const where = {};

    if ((searchString=(searchString?.trim()))){
      const like = `%${searchString}%`;
      where[Op.or] = [
        { productName:    { [Op.iLike]: like } }
      ];
    }

    const { count: totalProducts, rows: products } = await db.Product.findAndCountAll({
      where,
      attributes: [
        'productId',
        'productName',
        'price',
        'rating',
        'isAvailable',
        'stockStatus'
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalProducts / limit) || 0;

    const result = {
      products,
      pagination: {
        page: safePage,
        limit,
        totalProducts,
        totalPages,
      },
    };
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  listProducts
};
