// The FALLBACK lengths only. The real answer is `partner_plans.days`, which the
// admin panel owns (src/services/partnerPlan.service.durationDays). These stay so
// the pure helper below keeps working for a legacy id, or when the table cannot
// be read — a salon creation must not fail because the price list is missing.
const plans = {
  trial_2_months: 60,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  Free: 90
};

/**
 * Returns plan end date as Date object
 * @param {Date} startDate
 * @param {string} planType
 * @returns {Date}
 */
/** End date for an explicit number of days (what the admin configured). */
const getPlanEndDateInDays = (startDate, days) => {
  const endDate = new Date(startDate);
  // `setDate` on a copy, and via UTC-safe arithmetic, so a DST jump never takes
  // a day off a subscription.
  endDate.setDate(endDate.getDate() + (Number(days) > 0 ? Number(days) : 30));
  return endDate;
};

/**
 * Returns plan end date as Date object
 * @param {Date} startDate
 * @param {string} planType
 * @param {{ days?: number }} options  when `days` is given it wins: that is the
 *        length the admin set for this plan in the panel.
 * @returns {Date}
 */
const getPlanEndDate = (startDate, planType, options = {}) => {
  if (Number(options?.days) > 0) return getPlanEndDateInDays(startDate, options.days);
  const daysToAdd = plans[planType] ?? 30;
  return getPlanEndDateInDays(startDate, daysToAdd);
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

module.exports = { plans, getPlanEndDate, getPlanEndDateInDays, isPlanActive };
