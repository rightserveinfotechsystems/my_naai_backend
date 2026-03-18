const { Op } = require('sequelize');
const db = require('../database/models');

const addTransaction = async (dataToInsert) => {
  try {
    const transaction = await db.Transaction.create(dataToInsert);
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;  // throw re‑throw, controller catch karega
  }
};

module.exports =  {addTransaction};
