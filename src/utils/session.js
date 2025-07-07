// Constants for session management
const SESSIONS_PER_DAY = 4; // Number of sessions per day
const SESSION_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Get today's UTC midnight timestamp
const getTodayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// Calculate next session unlock time based on previous unlock time
const getNextSessionUnlockTime = (previousUnlockTime) => {
  if (!previousUnlockTime) return null;
  return new Date(previousUnlockTime.getTime() + SESSION_INTERVAL);
};

module.exports = {
  SESSIONS_PER_DAY,
  SESSION_INTERVAL,
  getTodayUTC,
  getNextSessionUnlockTime
};
