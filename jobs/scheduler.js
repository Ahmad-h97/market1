import cron from "node-cron";
import { runDailyRefresh } from "./dailyRefresh.js";
import { runHourlyRefresh } from "./hourlyRefresh.js";

// Run every 30 seconds (hourly job for test)
cron.schedule("0 * * * *", async () => {
  console.log("⏳ Running hourly refresh (test)...");
  const updatedCount = await runHourlyRefresh();
  console.log(`✅ Hourly refresh updated ${updatedCount} houses`);
});


// Daily job at 4:00 AM Syria time
cron.schedule(
  "0 4 * * *", // At 04:00 every day
  async () => {
    console.log("⏳ Running daily refresh...");
    const updatedCount = await runDailyRefresh();
    console.log(`✅ Daily refresh updated ${updatedCount} houses`);
  },
  {
    timezone: "Asia/Damascus" // ensures 4 AM Syria time even if server timezone changes
  }
);