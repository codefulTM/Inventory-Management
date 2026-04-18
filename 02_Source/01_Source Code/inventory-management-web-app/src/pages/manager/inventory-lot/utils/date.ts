export function toDateInputValue(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD"
}
