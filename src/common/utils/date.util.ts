export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isPastDate(date: string): boolean {
  const inputDate = parseLocalDate(date);

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return inputDate < todayOnly;
}

export function isSunday(date: string): boolean {
  const inputDate = parseLocalDate(date);
  return inputDate.getDay() === 0;
}

export function isTooFarInFuture(date: string, maxDaysAhead = 30): boolean {
  const inputDate = parseLocalDate(date);

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const maxDate = new Date(todayOnly);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);

  return inputDate > maxDate;
}
