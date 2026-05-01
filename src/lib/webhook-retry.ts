// lib/webhook-retry.ts

export function getNextRetryTime(attempt: number) {
  const delays = [
    1 * 60 * 1000,      // 1 min
    5 * 60 * 1000,      // 5 min
    15 * 60 * 1000,     // 15 min
    60 * 60 * 1000,     // 1 hour
    6 * 60 * 60 * 1000, // 6 hours
  ];

  const delay = delays[Math.min(attempt - 1, delays.length - 1)];

  return new Date(Date.now() + delay);
}