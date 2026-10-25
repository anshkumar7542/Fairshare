export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);
}

export function parseMoneyToCents(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}
