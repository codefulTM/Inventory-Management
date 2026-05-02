/**
 * Export Utilities
 * Tiện ích xuất dữ liệu ra file CSV
 * Hỗ trợ export giao dịch tồn kho với định dạng chuẩn
 */

import type { InventoryTransaction } from '../services/transactionService';

/**
 * Record dữ liệu cho CSV - giá trị có thể là string, number hoặc boolean
 */
interface CSVRecord {
  [key: string]: string | number | boolean;
}

/**
 * Escape giá trị cho CSV: xử lý dấu ngoặc kép, dấu phẩy, newline
 * @param value - Giá trị cần escape
 */
const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Escape double quotes và wrap trong quotes nếu có ký tự đặc biệt
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Format ngày giờ cho CSV: MM/DD/YYYY, HH:MM:SS AM/PM
 */
const formatDateForCSV = (date: string | Date): string => {
  const dateObj = new Date(date);
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Xuất danh sách giao dịch tồn kho ra file CSV
 * @param transactions - Danh sách giao dịch cần export
 * @param filename - Tên file (mặc định: 'inventory-transactions.csv')
 */
export const exportTransactionsToCSV = (transactions: InventoryTransaction[], filename: string = 'inventory-transactions.csv'): void => {
  if (!transactions || transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  // Tiêu đề cột
  const headers = [
    'Transaction ID',
    'Lot ID',
    'Material ID',
    'Type',
    'Quantity',
    'Unit of Measure',
    'Transaction Date',
    'Reference Number',
    'Performed By',
    'Notes',
    'Created Date',
  ];

  // Dữ liệu các dòng
  const dataRows: CSVRecord[] = transactions.map((tx) => ({
    'Transaction ID': tx.transaction_id,
    'Lot ID': tx.lot_id,
    'Material ID': tx.material_id,
    'Type': tx.transaction_type,
    'Quantity': tx.quantity,
    'Unit of Measure': tx.unit_of_measure,
    'Transaction Date': formatDateForCSV(tx.transaction_date),
    'Reference Number': tx.reference_number || '',
    'Performed By': tx.performed_by,
    'Notes': tx.notes || '',
    'Created Date': formatDateForCSV(tx.created_date),
  }));

  // Xây dựng nội dung CSV
  let csvContent = headers.map(escapeCSVValue).join(',') + '\n';
  csvContent += dataRows
    .map((row) => headers.map((header) => escapeCSVValue(row[header])).join(','))
    .join('\n');

  // Tạo blob và tải xuống
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Dọn dẹp object URL
  URL.revokeObjectURL(url);
};

/**
 * Tạo tên file CSV với timestamp
 * Format: inventory-transactions-MM-DD-YYYY-HH-MM.csv
 */
export const generateCSVFilename = (): string => {
  const now = new Date();
  const dateString = now
    .toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/[/:\s]/g, '-');

  return `inventory-transactions-${dateString}.csv`;
};
