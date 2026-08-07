// cron/bookingCompletionCron.js

const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const { Op } = require("sequelize");

const Booking = require("../src/database/models/booking.model"); // Update the path if needed

dayjs.extend(utc);
dayjs.extend(timezone);

cron.schedule(
  "0 23 * * *", // Every day at 11:00 PM IST
  async () => {
    try {
      const today = dayjs()
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      console.log(
        `[Booking Completion Cron] Running for date: ${today}`
      );

      const [updatedCount] = await Booking.update(
        {
          bookingStatus: "completed",
        },
        {
          where: {
            bookingDate: today,
            bookingStatus: {
              // Remove "pending" if it is not present in your ENUM
              [Op.in]: ["confirmed"],
              // If pending exists in DB, use:
              // [Op.in]: ["confirmed", "pending"]
            },
          },
        }
      );

      console.log(
        `[Booking Completion Cron] ${updatedCount} booking(s) marked as completed.`
      );
    } catch (error) {
      console.error("[Booking Completion Cron Error]", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

