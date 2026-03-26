import type { InventoryTransaction } from '../services/transactionService';

interface CSVRecord {
  [key: string]: string | number | boolean;
}

const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Escape double quotes and wrap in quotes if needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

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

export const exportTransactionsToCSV = (transactions: InventoryTransaction[], filename: string = 'inventory-transactions.csv'): void => {
  if (!transactions || transactions.length === 0) {
    console.warn('No transactions to export');
    return;
  }

  // Prepare headers
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

  // Prepare data rows
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

  // Build CSV content
  let csvContent = headers.map(escapeCSVValue).join(',') + '\n';
  csvContent += dataRows
    .map((row) => headers.map((header) => escapeCSVValue(row[header])).join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  URL.revokeObjectURL(url);
};

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
