export function getWeekdayKey(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  return days[localDate.getDay()];
}
