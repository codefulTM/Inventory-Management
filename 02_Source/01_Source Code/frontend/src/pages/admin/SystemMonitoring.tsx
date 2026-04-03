import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  services: {
    name: string;
    status: 'running' | 'stopped' | 'unknown';
  }[];
  timestamp: Date;
}

const SystemMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');

      const [metricsResponse, alertsResponse] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/system-monitoring/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${apiBaseUrl}/api/system-monitoring/alerts?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setMetrics(metricsResponse.data);
      setAlerts(alertsResponse.data.alerts || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch system metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (usage: number, threshold: number = 80): string => {
    if (usage >= threshold) return '#d32f2f';
    if (usage >= 70) return '#f57c00';
    if (usage >= 50) return '#fbc02d';
    return '#388e3c';
  };

  const getStatusIcon = (usage: number, threshold: number = 80) => {
    if (usage >= threshold)
      return <ErrorIcon sx={{ color: '#d32f2f', fontSize: '2rem' }} />;
    if (usage >= 70)
      return <WarningIcon sx={{ color: '#f57c00', fontSize: '2rem' }} />;
    return <CheckCircleIcon sx={{ color: '#388e3c', fontSize: '2rem' }} />;
  };

  const MetricCard: React.FC<{
    title: string;
    usage: number;
    total: string;
    threshold?: number;
  }> = ({ title, usage, total, threshold = 80 }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {getStatusIcon(usage, threshold)}
        </Box>
        <Typography sx={{ mb: 1 }}>
          <strong>{Math.round(usage)}%</strong> of {total}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={usage}
          sx={{
            height: '8px',
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getStatusColor(usage, threshold),
            },
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>System Monitoring Dashboard (US33)</h1>
        <p>Real-time system metrics and alerts for IT administrators</p>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchMetrics}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </Button>
      </Box>

      {loading && !metrics ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : metrics ? (
        <>
          {/* Metrics Grid */}
          <Box
            sx={{
              mb: 4,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            <Box>
              <MetricCard
                title="CPU Usage"
                usage={metrics.cpu.usage}
                total={`${metrics.cpu.cores} cores (${metrics.cpu.model})`}
                threshold={80}
              />
            </Box>
            <Box>
              <MetricCard
                title="Memory Usage"
                usage={metrics.memory.usage_percent}
                total={`${metrics.memory.total_gb} GB`}
                threshold={85}
              />
            </Box>
            <Box>
              <MetricCard
                title="Disk Usage"
                usage={metrics.disk.usage_percent}
                total={`${metrics.disk.total_gb} GB`}
                threshold={90}
              />
            </Box>
          </Box>

          {/* Services Status */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Services Status
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Service Name</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.services.map((service, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {service.status === 'running' ? (
                            <CheckCircleIcon sx={{ color: '#388e3c' }} />
                          ) : (
                            <ErrorIcon sx={{ color: '#d32f2f' }} />
                          )}
                          <span
                            style={{
                              textTransform: 'capitalize',
                              fontWeight: 'bold',
                              color: service.status === 'running' ? '#388e3c' : '#d32f2f',
                            }}
                          >
                            {service.status}
                          </span>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Recent Alerts */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Alerts
            </Typography>
            {alerts.length === 0 ? (
              <Alert severity="success">No alerts</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.map((alert, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              backgroundColor: '#ffebee',
                              color: '#d32f2f',
                              borderRadius: '4px',
                              fontSize: '0.85em',
                              fontWeight: 'bold',
                            }}
                          >
                            {alert.type}
                          </Box>
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Last Updated */}
          <Box sx={{ mt: 3, textAlign: 'right', color: '#666', fontSize: '0.9em' }}>
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </Box>
        </>
      ) : (
        <Alert severity="info">No metrics available</Alert>
      )}
    </Container>
  );
};

export default SystemMonitoring;
