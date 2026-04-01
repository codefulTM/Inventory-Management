import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Spin, Statistic } from 'antd';
import { getAuditReport, getInventoryStatusReport } from '../../services/reportsService';

export default function DashboardIT() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState(0);
  const [events, setEvents] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventory, audit] = await Promise.all([
          getInventoryStatusReport(),
          getAuditReport(),
        ]);
        setLots(inventory.total_lots || 0);
        setEvents(audit.entries?.length || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IT dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IT Admin Dashboard</h1>
        <p className="text-sm text-gray-500">System health and operational overview</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {loading ? (
        <div className="py-12 text-center">
          <Spin />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="Tracked Inventory Lots" value={lots} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="Recent Audit Events" value={events} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="Core Services" value="Online" />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
