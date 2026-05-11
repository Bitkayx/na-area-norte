export function getCurrentDay(): number {
  return new Date().getDate();
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month - 1] || "";
}

export function getDayStatus(day: number, currentDay: number): "past" | "current" | "future" {
  if (day < currentDay) return "past";
  if (day === currentDay) return "current";
  return "future";
}

export function isDayAccessible(day: number): boolean {
  const currentDay = getCurrentDay();
  return day <= currentDay;
}