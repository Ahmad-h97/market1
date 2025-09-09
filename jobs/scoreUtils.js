import House from "../models/House.js";

// Simple example, adjust weights as you like
export function calculateScore(house) {
  const { views = 0, clicks = 0, createdAt } = house;

  // Engagement formula
  const engagementScore = clicks / (views + 10) + Math.log(clicks + 1) / 10;

  // Freshness: reduce 0.1 per day since creation
  const ageInDays = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.max(0, 1 - ageInDays * 0.1); // minimum 0

  // Total score = engagement + freshness
  const totalScore = engagementScore + freshnessScore;

  return totalScore;
}
