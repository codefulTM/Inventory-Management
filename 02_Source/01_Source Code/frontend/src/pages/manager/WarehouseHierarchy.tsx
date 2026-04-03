import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

interface LocationNode {
  location_code: string;
  location_name: string;
  level: string;
  quantity: number;
  capacity?: number;
  is_active: boolean;
  children: LocationNode[];
  notes?: string;
}

const WarehouseHierarchy: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingLocation, setEditingLocation] = useState<{ code: string; notes: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);



  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${apiBaseUrl}/api/warehouse/hierarchy`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHierarchy(response.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to fetch warehouse hierarchy');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchHierarchy();
    // Poll for real-time updates every 30 seconds
    const interval = setInterval(fetchHierarchy, 30000);
    return () => clearInterval(interval);
  }, [fetchHierarchy]);

  const handleEditNotes = (location: LocationNode) => {
    setEditingLocation({ code: location.location_code, notes: location.notes || '' });
    setDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!editingLocation) return;

    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${apiBaseUrl}/api/warehouse/location/${editingLocation.code}/notes`, {
        notes: editingLocation.notes,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDialogOpen(false);
      setEditingLocation(null);
      await fetchHierarchy();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      alert('Failed to save notes: ' + (axiosError.response?.data?.message || 'Unknown error'));
    }
  };

  const getCapacityColor = (quantity: number, capacity?: number): string => {
    if (!capacity) return '#1976d2';
    const percentage = (quantity / capacity) * 100;
    if (percentage >= 90) return '#d32f2f'; // Red
    if (percentage >= 70) return '#f57c00'; // Orange
    if (percentage >= 50) return '#fbc02d'; // Yellow
    return '#388e3c'; // Green
  };

  const renderLocationNode = (node: LocationNode): React.ReactNode => {
    const percentUsed = node.capacity ? Math.round((node.quantity / node.capacity) * 100) : 0;
    const nodeLabel = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 8px',
          backgroundColor: getCapacityColor(node.quantity, node.capacity) + '20',
          borderRadius: '4px',
        }}
      >
        <span style={{ fontWeight: 'bold' }}>{node.location_name}</span>
        <span style={{ fontSize: '0.85em', color: '#666' }}>
          {node.quantity} / {node.capacity || '∞'} {node.capacity ? `(${percentUsed}%)` : ''}
        </span>
        <Button
          size="small"
          startIcon={<EditIcon fontSize="small" />}
          onClick={(e) => {
            e.stopPropagation();
            handleEditNotes(node);
          }}
          sx={{ ml: 'auto', fontSize: '0.75em' }}
        >
          Notes
        </Button>
      </Box>
    );

    return (
      <TreeItem key={node.location_code} nodeId={node.location_code} label={nodeLabel}>
        {node.children && node.children.map((child) => renderLocationNode(child))}
      </TreeItem>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h1>Warehouse Hierarchy Monitor (US08)</h1>
        <p>Real-time inventory monitoring by warehouse location</p>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={fetchHierarchy} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {loading && !hierarchy.length ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : hierarchy.length === 0 ? (
        <Alert severity="info">No warehouse hierarchy data available</Alert>
      ) : (
        <Box
          sx={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            p: 2,
            backgroundColor: '#fafafa',
            overflowX: 'auto',
          }}
        >
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            defaultExpanded={['WH001']}
          >
            {hierarchy.map((warehouse) => renderLocationNode(warehouse))}
          </TreeView>
        </Box>
      )}

      {/* Notes Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Location Notes</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Notes"
            value={editingLocation?.notes || ''}
            onChange={(e) =>
              setEditingLocation(
                editingLocation ? { ...editingLocation, notes: e.target.value } : null,
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveNotes} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Color Legend */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Capacity Usage Legend</h3>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: '20px', height: '20px', backgroundColor: '#388e3c' }} />
            <span>0-50%: Good</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: '20px', height: '20px', backgroundColor: '#fbc02d' }} />
            <span>50-70%: Caution</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: '20px', height: '20px', backgroundColor: '#f57c00' }} />
            <span>70-90%: Warning</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: '20px', height: '20px', backgroundColor: '#d32f2f' }} />
            <span>90%+: Critical</span>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default WarehouseHierarchy;
