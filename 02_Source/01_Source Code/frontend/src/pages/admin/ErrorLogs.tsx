import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Pagination,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

interface AppLog {
  _id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  error_code?: string;
  module?: string;
  created_at: string;
}

export default function ErrorLogs() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async (searchQuery = '') => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      let url = `${apiBaseUrl}/api/logs?page=${page}&limit=${limit}`;

      if (searchQuery.trim()) {
        url = `${apiBaseUrl}/api/logs/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLogs(response.data.data);
      setTotal(response.data.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs(search);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#d32f2f';
      case 'warn':
        return '#f57c00';
      case 'info':
        return '#1976d2';
      default:
        return '#666';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <h1>Log Management (US34)</h1>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Search by error code, session, or message"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">No logs found</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Error Code</TableCell>
                  <TableCell>Module</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{new Date(log.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        sx={{ backgroundColor: getLevelColor(log.level), color: 'white' }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                      {log.message}
                    </TableCell>
                    <TableCell>{log.error_code || '-'}</TableCell>
                    <TableCell>{log.module || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={total}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </>
      )}
    </Container>
  );
}
