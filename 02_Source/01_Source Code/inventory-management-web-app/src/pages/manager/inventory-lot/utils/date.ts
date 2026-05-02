/**
 * Chuyển đổi chuỗi ISO datetime sang định dạng YYYY-MM-DD
 * Dùng cho input type="date" trong form
 * @param iso - Chuỗi ngày tháng ISO (VD: "2026-05-02T10:30:00.000Z")
 * @returns Chuỗi YYYY-MM-DD hoặc rỗng nếu không có dữ liệu
 */
export function toDateInputValue(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD"
}
