// Shared timezone utilities

// Convert a date to Tajikistan time (GMT+5)
export function getTajikistanTime(date: Date): Date {
  const utcTime = date.getTime();
  return new Date(utcTime + (5 * 60 * 60 * 1000));
}

// Get start of day in Tajikistan time
export function getStartOfDayTajikistan(date: Date): Date {
  const tajikTime = getTajikistanTime(date);
  
  // Create 00:00 Tajikistan time today and convert back to UTC
  const tajikMidnight = new Date(
    tajikTime.getFullYear(),
    tajikTime.getMonth(),
    tajikTime.getDate(),
    0, 0, 0, 0
  );

  // Convert to UTC by subtracting 5 hours
  return new Date(tajikMidnight.getTime() - (5 * 60 * 60 * 1000));
}