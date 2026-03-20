const plans = {
  trial_2_months: 60,
  monthly: 30,
  quarterly: 90,
  yearly: 365
};

/**
 * Returns plan end date as Date object
 * @param {Date} startDate
 * @param {string} planType
 * @returns {Date}
 */
const getPlanEndDate = (startDate, planType) => {
  const daysToAdd = plans[planType] ?? 30;

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + daysToAdd);

  return endDate;
};

/**
 * Checks if plan is still active
 * @param {string | Date} planEndDate
 * @returns {boolean}
 */
const isPlanActive = (planEndDate) => {
  if (!planEndDate) return false;

  const end = new Date(planEndDate);
  const now = new Date();

  // if planEndDate is invalid
  if (isNaN(end.getTime())) return false;

  return end.getTime() >= now.getTime();
};

module.exports = { plans, getPlanEndDate, isPlanActive };
