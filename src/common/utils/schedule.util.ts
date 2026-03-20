export function buildSchedulesMessage(schedules: string[]): string {
  return schedules.map((time, index) => `${index + 1}. ${time}`).join('\n');
}
