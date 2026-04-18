import React, { useState } from 'react';
import type { TransactionFilters } from '../../services/transactionService';

interface TransactionFiltersProps {
  onApply: (filters: TransactionFilters) => void;
  onReset: () => void;
}

export const TransactionFiltersComponent: React.FC<TransactionFiltersProps> = ({
  onApply,
  onReset,
}) => {
  const [lotId, setLotId] = useState<string>('');
  const [materialId, setMaterialId] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'All' | 'Receipt' | 'Usage'>('All');
  const [performedBy, setPerformedBy] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleApply = () => {
    const filters: TransactionFilters = {};

    if (lotId.trim()) filters.lot_id = lotId;
    if (materialId.trim()) filters.material_id = materialId;
    if (transactionType !== 'All') filters.transaction_type = transactionType;
    if (performedBy.trim()) filters.performed_by = performedBy;
    if (referenceNumber.trim()) filters.reference_number = referenceNumber;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    onApply(filters);
  };

  const handleReset = () => {
    setLotId('');
    setMaterialId('');
    setTransactionType('All');
    setPerformedBy('');
    setReferenceNumber('');
    setDateFrom('');
    setDateTo('');
    onReset();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Filter Transactions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Lot ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lot ID
          </label>
          <input
            type="text"
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
            placeholder="Enter lot ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Material ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material ID
          </label>
          <input
            type="text"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            placeholder="Enter material ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Transaction Type Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as 'All' | 'Receipt' | 'Usage')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Receipt">Receipt</option>
            <option value="Usage">Usage</option>
          </select>
        </div>

        {/* Performed By Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Performed By
          </label>
          <input
            type="text"
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            placeholder="User ID or name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Reference Number Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="PO #, Batch ID, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
