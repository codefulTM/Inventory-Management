import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Spin, Statistic, Table } from 'antd';
import { getInventoryStatusReport } from '../../services/reportsService';
import { transactionService } from '../../services/transactionService';
import type { InventoryStatusReport } from '../../types/reports';

export default function DashboardOperator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryStatusReport | null>(null);
  const [transactionTotal, setTransactionTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventoryReport, txResult] = await Promise.all([
          getInventoryStatusReport(),
          transactionService.getTransactions({}, 1, 1),
        ]);
        setInventory(inventoryReport);
        setTransactionTotal(txResult.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operator dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const depletedCount = useMemo(
    () => (inventory?.items || []).filter((item) => item.status === 'Depleted').length,
    [inventory],
  );

  const quarantineCount = useMemo(
    () => (inventory?.items || []).filter((item) => item.status === 'Quarantine').length,
    [inventory],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="text-sm text-gray-500">Daily warehouse operations snapshot</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {loading ? (
        <div className="py-12 text-center">
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Total Lots" value={inventory?.total_lots || 0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Quarantine Lots" value={quarantineCount} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Total Transactions" value={transactionTotal} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Depleted Lots" value={depletedCount} />
              </Card>
            </Col>
          </Row>

          <Card title="Latest Inventory Lots" className="mt-4">
            <Table
              rowKey="lot_id"
              dataSource={(inventory?.items || []).slice(0, 10)}
              pagination={false}
              columns={[
                { title: 'Lot', dataIndex: 'lot_id' },
                { title: 'Material', dataIndex: 'material_id' },
                { title: 'Quantity', dataIndex: 'quantity' },
                { title: 'Status', dataIndex: 'status' },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
