import React, { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import axios from 'axios';

interface Material {
  _id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions: string;
  created_date: string;
  modified_date: string;
}

interface PaginatedResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MaterialQuery: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchMaterials();
  }, [page]);

  const fetchMaterials = async (customSearch = '') => {
    setLoading(true);
    setError('');

    try {
      const query = customSearch || searchQuery;
      let url = `${apiBaseUrl}/api/materials?page=${page}&limit=${limit}`;

      if (query.trim()) {
        url = `${apiBaseUrl}/api/materials/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      }

      const token = localStorage.getItem('access_token');
      const response = await axios.get<PaginatedResponse>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMaterials(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setPage(response.data.pagination.page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch materials');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchMaterials(searchQuery);
  };

  const handleExportExcel = async () => {
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const token = localStorage.getItem('access_token');

      const response = await axios.get(`${apiBaseUrl}/api/materials/export/excel${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `materials_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export Excel: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const handleExportPDF = async () => {
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const token = localStorage.getItem('access_token');

      const response = await axios.get(`${apiBaseUrl}/api/materials/export/pdf${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `materials_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>Material Query & Export (US07)</h1>
        <p>Search for materials by SKU or name and export to Excel/PDF</p>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Search by Material ID, Part Number, or Name"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          sx={{ flex: 1, minWidth: '250px' }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          sx={{ height: '56px' }}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={handleExportExcel}
          sx={{ height: '56px' }}
        >
          Export Excel
        </Button>
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={handleExportPDF}
          sx={{ height: '56px' }}
        >
          Export PDF
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : materials.length === 0 ? (
        <Alert severity="info">No materials found</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Material ID</TableCell>
                  <TableCell>Part Number</TableCell>
                  <TableCell>Material Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Storage Conditions</TableCell>
                  <TableCell>Created Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material._id} hover>
                    <TableCell>{material.material_id}</TableCell>
                    <TableCell>{material.part_number}</TableCell>
                    <TableCell>{material.material_name}</TableCell>
                    <TableCell>{material.material_type}</TableCell>
                    <TableCell>{material.storage_conditions || '-'}</TableCell>
                    <TableCell>{new Date(material.created_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default MaterialQuery;
