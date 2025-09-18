export function formatCurrency(cents: number, locale = "ru-RU", currency = "RUB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: Date | null | undefined, locale = "ru-RU") {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}
