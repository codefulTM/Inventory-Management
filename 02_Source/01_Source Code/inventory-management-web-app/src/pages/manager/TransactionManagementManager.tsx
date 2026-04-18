import React, { useState, useCallback, useEffect } from 'react';
import type { InventoryTransaction, TransactionFilters } from '../../services/transactionService';
import { transactionService } from '../../services/transactionService';
import { TransactionFiltersComponent } from '../../components/manager/TransactionFilters';
import { TransactionTableComponent } from '../../components/manager/TransactionTable';
import { exportTransactionsToCSV, generateCSVFilename } from '../../utils/exportUtils';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const TransactionManagementManager: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Fetch transactions based on current filters and pagination
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await transactionService.getTransactions(filters, pagination.page, pagination.limit);

      console.log('Fetched transactions:', response);
      setTransactions(response.data);
      setPagination({
        page: response.pagination?.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.pages,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Fetch on component mount and when filters/pagination change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Handle filter application
  const handleApplyFilters = (appliedFilters: TransactionFilters) => {
    setFilters(appliedFilters);
    setPagination((prev) => ({
      ...prev,
      page: 1, // Reset to first page when filters change
    }));
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({});
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination((prev) => ({
        ...prev,
        page: newPage,
      }));
    }
  };

  // Handle export
  const handleExport = () => {
    const filename = generateCSVFilename();
    exportTransactionsToCSV(transactions, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Transactions</h1>
          <p className="mt-2 text-gray-600">
            View and manage all inventory transactions across your organization.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={transactions.length === 0 || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Export to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Transactions</h2>
        <TransactionFiltersComponent
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </div>

      {/* Active Filters Display */}
      {Object.keys(filters).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Active filters:</span>{' '}
            {Object.entries(filters)
              .filter(([, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Table */}
      <TransactionTableComponent
        transactions={transactions}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
