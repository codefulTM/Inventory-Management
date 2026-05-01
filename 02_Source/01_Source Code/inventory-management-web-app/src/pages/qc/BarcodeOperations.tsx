import React, { useState } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

interface QueryResult {
  lot_id: string;
  material_id: string;
  quantity: number;
  unit: string;
  status: string;
  location?: string;
  received_date: string | Date;
  expiration_date: string | Date;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

const BarcodeOperations: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lotIdDownload, setLotIdDownload] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  const token = localStorage.getItem('access_token');

  // US41: Query by barcode/scan
  const handleQueryBarcode = async () => {
    if (!barcodeInput.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/barcode/query`,
        { barcode: barcodeInput },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.found) {
        setQueryResult(response.data.data);
      } else {
        setError('Barcode not found');
        setQueryResult(null);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to query barcode');
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  };

  // US40: Download barcode
  const handleDownloadBarcode = async () => {
    if (!lotIdDownload.trim()) {
      setError('Please enter a lot ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/barcode/download/${lotIdDownload}?format=png&type=code128`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `barcode_${lotIdDownload}.png`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to download barcode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <h1>Barcode Operations (US40 & US41)</h1>
      <p>Download barcodes for printing or scan to query lot information</p>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Tabs value={tabIndex} onChange={(_e, val) => setTabIndex(val)} sx={{ mb: 3 }}>
        <Tab label="Scan/Query Barcode (US41)" />
        <Tab label="Download Barcode (US40)" />
      </Tabs>

      {/* US41: Query/Scan */}
      <TabPanel value={tabIndex} index={0}>
        <Card>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Scan barcode or enter manually"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQueryBarcode()}
                autoFocus
              />
            </Box>

            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleQueryBarcode}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Querying...' : 'Query'}
            </Button>

            {loading && <CircularProgress sx={{ display: 'block', m: 'auto', mt: 3 }} />}

            {queryResult && (
              <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Lot ID</TableCell>
                      <TableCell><strong>{queryResult.lot_id}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Material ID</TableCell>
                      <TableCell>{queryResult.material_id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Quantity</TableCell>
                      <TableCell>{queryResult.quantity} {queryResult.unit}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>
                        <Chip
                          label={queryResult.status}
                          color={queryResult.status === 'Accepted' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell>{queryResult.location || 'Not assigned'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Received Date</TableCell>
                      <TableCell>{new Date(queryResult.received_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Expiration Date</TableCell>
                      <TableCell>{new Date(queryResult.expiration_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* US40: Download */}
      <TabPanel value={tabIndex} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Enter Lot ID"
                value={lotIdDownload}
                onChange={(e) => setLotIdDownload(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDownloadBarcode()}
              />
            </Box>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadBarcode}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Generating...' : 'Download Barcode'}
            </Button>

            {loading && <CircularProgress sx={{ display: 'block', m: 'auto', mt: 3 }} />}

            <Alert severity="info" sx={{ mt: 3 }}>
              Barcode will be downloaded as PNG image ready for printing.
              Supported formats: CODE128, EAN13, QR Code
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
};

export default BarcodeOperations;
