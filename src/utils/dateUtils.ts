/**
 * Formats a date string treating it as local date (not UTC)
 * This prevents timezone conversion issues where dates show one day less
 */
export function formatDate(
  dateString: string,
  locale: string = "es-ES",
): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();

    const localDate = new Date(utcYear, utcMonth, utcDay);

    return localDate.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Creates a Date object treating the input as local date (not UTC)
 */
export function createLocalDate(dateString: string): Date {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date();
    }

    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  } catch (error) {
    return new Date();
  }
}

/**
 * Formats date for display in individual post pages
 */
export function formatPostDate(dateString: string): string {
  return formatDate(dateString, "es-ES");
}
