const { Op } = require('sequelize');
const db = require('../database/models');

const addTransaction = async (dataToInsert, transaction) => {
  try {
    const transactionModel  = await db.Transaction.create(dataToInsert, { transaction });
    return transactionModel ;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;  // throw re‑throw
  }
};

module.exports = { addTransaction };
