import { apiClient } from './apiClient';

export interface InventoryTransaction {
  _id: string;
  transaction_id: string;
  lot_id: string;
  material_id: string;
  transaction_type: 'Receipt' | 'Usage';
  quantity: number;
  unit_of_measure: string;
  transaction_date: string | Date;
  reference_number?: string;
  performed_by: string;
  notes?: string;
  created_date: string | Date;
  modified_date: string | Date;
}

export interface TransactionFilters {
  lot_id?: string;
  material_id?: string;
  transaction_type?: 'Receipt' | 'Usage';
  performed_by?: string;
  reference_number?: string;
  dateFrom?: string | Date;
  dateTo?: string | Date;
}

export interface PaginatedTransactionResponse {
  data: InventoryTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Service for managing inventory transactions API calls
 */
export const transactionService = {
  /**
   * Get all transactions with optional filters and pagination
   */
  async getTransactions(
    filters: TransactionFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedTransactionResponse> {
    // Build query parameters
    const params: Record<string, any> = {};
    if (filters.lot_id) params.lot_id = filters.lot_id;
    if (filters.material_id) params.material_id = filters.material_id;
    if (filters.transaction_type) params.transaction_type = filters.transaction_type;
    if (filters.performed_by) params.performed_by = filters.performed_by;
    if (filters.reference_number) params.reference_number = filters.reference_number;
    if (filters.dateFrom) {
      const fromDate = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString() : filters.dateFrom;
      params.dateFrom = fromDate;
    }
    if (filters.dateTo) {
      const toDate = filters.dateTo instanceof Date ? filters.dateTo.toISOString() : filters.dateTo;
      params.dateTo = toDate;
    }
    params.page = page;
    params.limit = limit;

    const { data, error } = await apiClient.get<any>(
      '/inventory-transactions',
      { params },
    );

    if (error) {
      console.error('Error fetching transactions:', error);
      if (error.statusCode === 401) {
        throw new Error('Unauthorized - Please login');
      }
      if (error.statusCode === 403) {
        throw new Error('Forbidden - You do not have permission to view transactions');
      }
      throw new Error(error.message || 'Failed to fetch transactions');
    }

    // Extract payload from response wrapper (code, message, payload)
    return data.payload as PaginatedTransactionResponse;
  },

  /**
   * Get transactions for a specific lot
   */
  async getTransactionsByLotId(lotId: string): Promise<InventoryTransaction[]> {
    const { data, error } = await apiClient.get<any>(
      '/inventory-transactions',
      { params: { lot_id: lotId } },
    );

    if (error) {
      console.error('Error fetching transactions for lot:', error);
      if (error.statusCode === 401) {
        throw new Error('Unauthorized - Please login');
      }
      throw new Error(error.message || 'Failed to fetch transactions for lot');
    }

    // Extract data from response wrapper
    const result = data.payload as PaginatedTransactionResponse;
    return result.data || [];
  },

  /**
   * Export transactions to CSV format
   */
  exportToCSV(transactions: InventoryTransaction[], filename: string = 'transactions.csv'): void {
    try {
      // Define CSV headers
      const headers = [
        'Transaction ID',
        'Lot ID',
        'Material ID',
        'Type',
        'Quantity',
        'Unit',
        'Date',
        'Reference',
        'Performed By',
        'Notes',
      ];

      // Build CSV rows
      const rows = transactions.map((t) => [
        t.transaction_id,
        t.lot_id,
        t.material_id,
        t.transaction_type,
        t.quantity,
        t.unit_of_measure,
        new Date(t.transaction_date).toLocaleString(),
        t.reference_number || '',
        t.performed_by,
        t.notes || '',
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows].map((row) =>
        row.map((cell) => `"${cell}"`).join(','),
      ).join('\n');

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
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Failed to export transactions to CSV');
    }
  },
};
