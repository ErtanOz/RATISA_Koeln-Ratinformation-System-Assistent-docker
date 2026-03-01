export function validateDateRange(minDate?: string, maxDate?: string): string | null {
  if (!minDate || !maxDate) {
    return null;
  }

  if (minDate > maxDate) {
    return "Das Startdatum darf nicht nach dem Enddatum liegen.";
  }

  return null;
}
