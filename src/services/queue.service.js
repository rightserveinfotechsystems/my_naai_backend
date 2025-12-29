// src/services/queue.service.js
const db = require("../database/models");
const { Queue } = db;

const generateNextQueueAndToken = async (salonId, userId, t) => {
  const lastQueue = await db.Queue.findOne({
    where: { salonId },
    order: [["createdAt", "DESC"]],
    transaction: t,
  });

  const nextQueueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;
  const nextTokenNumber = nextQueueNumber; // yaha apna token logic rakh sakte ho

  const queue = await db.Queue.create(
    {
      salonId,
      // userId baad me controller se inject karenge
      // is helper me sirf numbers generate karne ka option bhi rakh sakte ho
      userId,
      queueNumber: nextQueueNumber,
      tokenNumber: nextTokenNumber,
    },
    { transaction: t }
  );

  return queue;
};

module.exports = { generateNextQueueAndToken };
