// services/interactionService.js
import mongoose from 'mongoose';
import House from '../models/House.js';
import UPI from '../models/UserPostInteraction.js';

export async function recordSeenForUser(userId, houseIds) {
  if (!userId || !Array.isArray(houseIds) || houseIds.length === 0) return;

  const now = new Date();
  const expireAt = new Date(now.getTime() + 7*24*60*60*1000);

  // Align ops with houseIds so we can map upserted indices back to houseIds
  const ops = houseIds.map((hid) => ({
    updateOne: {
      filter: { userId, houseId: hid },
      update: {
        $setOnInsert: { userId, houseId: hid, seenAt: now, expireAt },
      },
      upsert: true,
    }
  }));

  const res = await UPI.bulkWrite(ops, { ordered: false });

  // res.upsertedIds = { '0': ObjectId(...), '3': ObjectId(...), ... }
  const newlySeenHouseIds = Object.keys(res.upsertedIds || {}).map(i => houseIds[Number(i)]);

  if (newlySeenHouseIds.length) {
    await House.updateMany(
      { _id: { $in: newlySeenHouseIds } },
      { $inc: { viewsCount: 1 } }
    );
  }
}
