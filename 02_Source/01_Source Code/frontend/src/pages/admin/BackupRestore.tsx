import { useEffect, useState } from 'react';
import { Alert, Button, Card, List, Space, Typography, message } from 'antd';
import { getInventoryStatusReport } from '../../services/reportsService';

type BackupSnapshot = {
  id: string;
  createdAt: string;
  totalLots: number;
  depletedLots: number;
};

const STORAGE_KEY = 'ims-backup-snapshots';

function loadSnapshots(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BackupSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSnapshots(rows: BackupSnapshot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export default function BackupRestore() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const createBackup = async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await getInventoryStatusReport();
      const next: BackupSnapshot = {
        id: `BK-${Date.now()}`,
        createdAt: new Date().toISOString(),
        totalLots: report.total_lots,
        depletedLots: report.depleted_lots,
      };
      const updated = [next, ...snapshots].slice(0, 20);
      setSnapshots(updated);
      saveSnapshots(updated);
      message.success('Backup snapshot created');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create backup';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const restoreSnapshot = (snapshot: BackupSnapshot) => {
    message.info(`Restore queued for snapshot ${snapshot.id} (${snapshot.createdAt})`);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
        <p className="text-sm text-gray-500">Manage operational snapshots for recovery drills</p>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card>
        <Space>
          <Button type="primary" loading={loading} onClick={createBackup}>
            Create Snapshot
          </Button>
          <Typography.Text type="secondary">Snapshots are stored in browser local storage for demo flow.</Typography.Text>
        </Space>
      </Card>

      <Card title="Recent Snapshots">
        <List
          dataSource={snapshots}
          locale={{ emptyText: 'No snapshots available' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="restore" onClick={() => restoreSnapshot(item)}>
                  Restore
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`${item.id} - ${item.createdAt}`}
                description={`Total lots: ${item.totalLots} | Depleted lots: ${item.depletedLots}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
