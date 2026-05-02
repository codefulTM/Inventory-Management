/**
 * Export các utility functions cho module inventory-lot
 * - getStatusColor, getStatusText: Xử lý màu sắc và văn bản trạng thái
 * - toDateInputValue: Chuyển đổi ngày tháng sang định dạng input
 * - EditFormValues: Kiểu dữ liệu form
 * - INPUT_CLS, INPUT_ERR_CLS: Các class CSS cho input
 */
export { getStatusColor, getStatusText } from "./status";
export { toDateInputValue } from "./date";
export type { EditFormValues } from "./types";
export { INPUT_CLS, INPUT_ERR_CLS } from "./constants";
