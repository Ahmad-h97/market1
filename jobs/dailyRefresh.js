import House from "../models/House.js";
import { calculateScore } from "./scoreUtils.js";

export async function runDailyRefresh() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Houses created in last 7 days
  // but only if score hasn’t been updated since creation
  const houses = await House.find({
    createdAt: { $gte: sevenDaysAgo },
    $or: [
      { lastScoreUpdateAt: null },                         // never updated
      { $expr: { $lt: ["$lastScoreUpdateAt", "$createdAt"] } } // updated before creation
    ]
  });

  if (houses.length > 0) {
    const bulkOps = houses.map(house => ({
      updateOne: {
        filter: { _id: house._id },
        update: { score: calculateScore(house), lastScoreUpdateAt: new Date() }
      }
    }));

    await House.bulkWrite(bulkOps);
  }

  console.log(`✅ Daily refresh updated ${houses.length} houses`);
}
