// services/salonRequest.service.js
const { Op } = require('sequelize');
const db = require('../database/models');

const create = async (data) => {
  try {
    return await db.SalonRequest.create(data);
  } catch (error) {
    throw new Error(error.message);
  }
};

const getByPhone = async (phoneNumber) => {
  try {
    return await db.SalonRequest.findOne({ where: {phone_number: phoneNumber } });
  } catch (error) {
    throw new Error(error.message);
  }
};
const listSalonRequests = async ({ page = 1, searchString = '', salonNameFilter = '', requestDate = '', limit }) => {
  try {
    
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    
    const offset = (page - 1) * safeLimit;
    const where = {};

    // ✅ SearchString 
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { salonName: { [Op.iLike]: like } },
        { fullName: { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { address: { [Op.iLike]: like } }
      ];
    }

    
    if (salonNameFilter?.trim()) { 
      where.salonName = { [Op.iLike]: `%${salonNameFilter.trim()}%` };
    }

    if (requestDate) {
      const startOfDay = new Date(requestDate + 'T00:00:00.000Z');
      const endOfDay = new Date(requestDate + 'T23:59:59.999Z');
      where.createdAt = { 
        [Op.between]: [startOfDay, endOfDay] 
      };
    }


    const totalRequests = await db.SalonRequest.count({where});


    
    const requests = await db.SalonRequest.findAll({
      where,
      attributes: { exclude: ['deletedAt'] },
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']]
    });


    const requestsWithData = requests.map(request => request.toJSON());

  
    return {
      requests: requestsWithData,
      totalRequests: totalRequests,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalRequests / safeLimit)
    };
  } catch (error) {
    throw error;
  }
};
// ✅ Single get
const getSalonRequestById = async (requestId) => {
    return await db.SalonRequest.findOne({
        where: { requestId }
    });
};

// ✅ Bulk get
const getSalonRequestsByIds = async (requestIds) => {
    return await db.SalonRequest.findAll({
        where: { requestId: requestIds }
    });
};

// ✅ Single delete (soft delete)
const deleteSalonRequest = async (requestId) => {
    const request = await db.SalonRequest.findOne({ where: { requestId } });
    if (request) {
        await request.destroy();
        return true;
    }
    return false;
};

// ✅ Bulk delete
const deleteSalonRequestsBulk = async (requestIds) => {
    const deletedCount = await db.SalonRequest.destroy({
        where: { requestId: { [Op.in]: requestIds } }
    });
    return deletedCount;
};



module.exports = {
  create,
  getByPhone,
  listSalonRequests,
  getSalonRequestById,
  getSalonRequestsByIds,
  deleteSalonRequest,
  deleteSalonRequestsBulk
};
