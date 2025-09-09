import House from "../models/House.js";
import { calculateScore } from "./scoreUtils.js";

export async function runHourlyRefresh() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Only houses with interaction in last 1h
  // and score not updated since that interaction
  const houses = await House.find({
    lastInteractionAt: { $gte: oneHourAgo },
    $or: [
      { lastScoreUpdateAt: null },                         // never updated
      { $expr: { $lt: ["$lastScoreUpdateAt", "$lastInteractionAt"] } } // updated before last interaction
    ]
  });

  if (houses.length > 0) {
    // Prepare bulk operations
    const bulkOps = houses.map(house => ({
      updateOne: {
        filter: { _id: house._id },
        update: { score: calculateScore(house), lastScoreUpdateAt: new Date() }
      }
    }));

    await House.bulkWrite(bulkOps);
  }

  console.log(`✅ Hourly refresh updated ${houses.length} houses`);
}
