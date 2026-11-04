const intervalUnits = new Set(['week', 'month', 'year']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function recurringDate(startDate, intervalUnit, intervalCount, occurrenceIndex) {
  if (!datePattern.test(startDate) || !intervalUnits.has(intervalUnit) ||
      !Number.isInteger(intervalCount) || intervalCount < 1 || !Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) {
    throw new Error('Invalid recurring expense schedule');
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) {
    throw new Error('Invalid recurring expense start date');
  }
  if (intervalUnit === 'week') {
    start.setUTCDate(start.getUTCDate() + 7 * intervalCount * occurrenceIndex);
  } else {
    const monthsToAdd = (intervalUnit === 'year' ? 12 : 1) * intervalCount * occurrenceIndex;
    const targetYear = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + monthsToAdd) / 12);
    const targetMonth = (start.getUTCMonth() + monthsToAdd) % 12;
    const targetDay = Math.min(start.getUTCDate(), daysInMonth(targetYear, targetMonth));
    start.setUTCFullYear(targetYear, targetMonth, targetDay);
  }
  return start.toISOString().slice(0, 10);
}
