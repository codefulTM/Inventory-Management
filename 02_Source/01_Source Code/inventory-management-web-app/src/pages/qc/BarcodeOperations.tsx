/**
 * BarcodeOperations - Trang quản lý mã vạch (Barcode) dành cho QC Technician
 * ==================================================================
 * Chức năng chính:
 * - Quét/tra cứu mã vạch (Barcode/QR Code) để xem thông tin lô hàng
 * - Hiển thị thông tin chi tiết từ mã vạch: mã lô, vật tư, ngày SX, hạn dùng
 * - Tìm kiếm lô hàng theo mã vạch (dùng camera hoặc nhập thủ công)
 * - Xuất báo cáo (export) danh sách lô đã quét được
 * - Lưu lịch sử các mã vạch đã quét trong phiên làm việc
 * 
 * Quy trình tra cứu mã vạch:
 * 1. Nhập mã vạch (lot_id) hoặc sử dụng camera để quét QR/Barcode
 * 2. Hệ thống truy vấn database để lấy thông tin lô hàng
 * 3. Hiển thị thông tin: trạng thái, vị trí kho, số lượng, hạn dùng
 * 4. QC có thể quyết định: Accept, Reject, hoặc Hold lô hàng
 * 
 * Tính năng xuất báo cáo:
 * - Xuất danh sách lô đã quét dưới dạng CSV
 * - Báo cáo bao gồm: mã lô, vật tư, trạng thái, ngày quét
 * 
 * Quyền truy cập: Chỉ Quality Control Technician (/qc/*)
 */

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

/**
 * Kết quả truy vấn mã vạch - Chứa thông tin chi tiết của lô hàng
 * Được sử dụng để hiển thị thông tin khi quét/tra cứu mã vạch
 */
interface QueryResult {
  lot_id: string;         // Mã lô hàng
  material_id: string;    // Mã nguyên liệu/sản phẩm
  quantity: number;        // Số lượng trong lô
  unit: string;           // Đơn vị tính
  status: string;         // Trạng thái lô: Accepted/Rejected/Quarantine/Hold
  location?: string;       // Vị trí lưu kho
  received_date: string | Date;    // Ngày nhập kho
  expiration_date: string | Date;  // Ngày hết hạn
}

/**
 * Props cho component TabPanel - Hiển thị nội dung theo tab được chọn
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;    // Chỉ số tab
  value: number;    // Giá trị tab hiện tại
}

/**
 * Component TabPanel - Chỉ hiển thị nội dung khi tab tương ứng được chọn
 * Sử dụng cho 2 tab: Quét mã vạch (US41) và Tải mã vạch (US40)
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

/**
 * BarcodeOperations Component - Quản lý thao tác mã vạch cho QC
 * 
 * Chức năng chính:
 * - US40: Tải mã vạch (Barcode) để in ấn - Dùng cho dán nhãn lô hàng
 * - US41: Quét/Tra cứu mã vạch - Xem thông tin nhanh của lô hàng
 * 
 * Quy trình:
 * 1. Tab Quét/Tra cứu: Nhập mã vạch → Gọi API → Hiển thị thông tin lô
 * 2. Tab Tải mã vạch: Nhập mã lô → Tải file PNG mã vạch (CODE128)
 */
const BarcodeOperations: React.FC = () => {
  // Quản lý tab hiện tại: 0 = Quét/Tra cứu, 1 = Tải mã vạch
  const [tabIndex, setTabIndex] = useState(0);
  
  // State cho tab Quét/Tra cứu (US41)
  const [barcodeInput, setBarcodeInput] = useState('');      // Giá trị mã vạch nhập vào
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);  // Kết quả truy vấn
  
  // State cho tab Tải mã vạch (US40)
  const [lotIdDownload, setLotIdDownload] = useState('');    // Mã lô cần tải mã vạch
  
  // State chung
  const [error, setError] = useState('');       // Thông báo lỗi
  const [loading, setLoading] = useState(false); // Trạng thái đang tải

  // Cấu hình API
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  const token = localStorage.getItem('access_token');

  /**
   * US41: Xử lý tra cứu mã vạch
   * Quy trình: Nhập mã vạch → Gọi API /api/barcode/query → Hiển thị thông tin lô
   * Sử dụng: Kiểm tra nhanh thông tin lô hàng khi nhận hàng hoặc trong kho
   */
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

  /**
   * US40: Tải mã vạch để in ấn
   * Quy trình: Nhập mã lô → Gọi API /api/barcode/download/:lotId → Tải file PNG
   * Định dạng: CODE128 (mặc định), có thể dùng EAN13, QR Code
   * Sử dụng: In nhãn dán lên lô hàng, quét khi xuất/nhập kho
   */
  const handleDownloadBarcode = async () => {
    // Kiểm tra đầu vào: mã lô không được để trống
    if (!lotIdDownload.trim()) {
      setError('Please enter a lot ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Gọi API tải mã vạch - responseType 'blob' để nhận file nhị phân
      const response = await axios.get(
        `${apiBaseUrl}/api/barcode/download/${lotIdDownload}?format=png&type=code128`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',  // Nhận dữ liệu dạng file
        },
      );

      // Tạo URL từ blob và kích hoạt tải xuống
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `barcode_${lotIdDownload}.png`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);  // Giải phóng bộ nhớ
    } catch (err: unknown) {
      // Xử lý lỗi từ API
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to download barcode');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Giao diện chính của trang Barcode Operations
   * Gồm 2 tab:
   * 1. Quét/Tra cứu mã vạch (US41) - Tìm kiếm thông tin lô hàng
   * 2. Tải mã vạch (US40) - Tải về file PNG để in ấn
   */
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Tiêu đề trang - Hiển thị chức năng US40 và US41 */}
      <h1>Barcode Operations (US40 & US41)</h1>
      <p>Download barcodes for printing or scan to query lot information</p>

      {/* Hiển thị thông báo lỗi nếu có */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Thanh Tab chuyển đổi giữa 2 chức năng */}
      <Tabs value={tabIndex} onChange={(_e, val) => setTabIndex(val)} sx={{ mb: 3 }}>
        <Tab label="Scan/Query Barcode (US41)" />
        <Tab label="Download Barcode (US40)" />
      </Tabs>

      {/* US41: Tab Quét/Tra cứu mã vạch - Tìm kiếm thông tin lô hàng */}
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
