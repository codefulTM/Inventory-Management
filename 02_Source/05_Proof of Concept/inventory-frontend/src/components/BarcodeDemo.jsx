import React, { useState, useEffect, useMemo } from 'react';
import Barcode from 'react-barcode';

const API_BASE_URL = 'http://localhost:3000';

export default function BarcodeDemo() {
  const [barcodes, setBarcodes] = useState([]); // Danh sách barcode
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [searchCode, setSearchCode] = useState('');
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(''); // lưu code vừa copy
  const [page, setPage] = useState(1);
  const itemsPerPage = 2;
  const [searchResult, setSearchResult] = useState(null);

  // Lấy tất cả barcode khi load component
  useEffect(() => {
    fetchBarcodes();
  }, []);

  // Reset to page 1 whenever data set changes (either list or search result)
  useEffect(() => {
    setPage(1);
  }, [searchResult, barcodes.length]);

  const dataToRender = useMemo(() => {
    return searchResult ? [searchResult] : barcodes;
  }, [searchResult, barcodes]);

  const totalPages = Math.max(1, Math.ceil(dataToRender.length / itemsPerPage));
  const pagedData = dataToRender.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const fetchBarcodes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/barcode`);
      if (!res.ok) throw new Error('Không lấy được danh sách barcode');
      const data = await res.json();
      setBarcodes(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateBarcode = async (e) => {
    e.preventDefault();
    setError('');
    setCopied('');
    try {
      const res = await fetch(`${API_BASE_URL}/barcode/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Tạo barcode thất bại');
      const data = await res.json();
      setShowCreate(false);
      setForm({ name: '', description: '' });
      setBarcodes((prev) => [...prev, data]);
      setSearchResult(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setFound(null);
    setCopied('');
    try {
      const res = await fetch(`${API_BASE_URL}/barcode/${searchCode}`);
      if (!res.ok) throw new Error('Không tìm thấy barcode');
      const data = await res.json();
      setFound(data);
      setSearchResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const clearSearch = () => {
    setSearchResult(null);
    setFound(null);
    setSearchCode('');
    setPage(1);
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Demo Barcode</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {searchResult && <button className="btn btn-primary" onClick={clearSearch}>Xóa tìm</button>}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Tạo Barcode</button>
        </div>
      </div>
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Tạo Barcode mới</h3>
            <form onSubmit={handleCreateBarcode}>
              <div style={{ marginBottom: 12 }}>
                <label>Tên sản phẩm:<br />
                  <input name="name" value={form.name} onChange={handleFormChange} required />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Mô tả:<br />
                  <input name="description" value={form.description} onChange={handleFormChange} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit">Xác nhận</button>
                <button className="btn" type="button" onClick={() => setShowCreate(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tìm kiếm barcode */}
      <form onSubmit={handleSearch} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input placeholder="Nhập mã barcode để tra cứu" value={searchCode} onChange={e => setSearchCode(e.target.value)} required style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit">Tìm kiếm</button>
      </form>

      {/* Bảng phân trang */}
      <div className="barcode-table">
        <div className="table-head">
          <span>Mã barcode</span>
          <span>Thông tin</span>
        </div>
        {pagedData.length === 0 && (
          <div className="table-row empty">Chưa có barcode</div>
        )}
        {pagedData.map((item) => (
          <div className="table-row" key={item.code}>
            <div className="barcode-cell">
              <Barcode value={item.code} width={1.2} height={60} />
              <div className="code-line">
                <span className="code-text">{item.code}</span>
                <button className="btn btn-ghost" onClick={() => handleCopy(item.code)}>
                  {copied === item.code ? 'Đã copy' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="info-cell">
              <div><b>Tên:</b> {item.name}</div>
              <div><b>Mô tả:</b> {item.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Phân trang */}
      {dataToRender.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          <button className="btn btn-primary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trang trước</button>
          <span>Trang {page} / {totalPages}</span>
          <button className="btn btn-primary" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Trang sau</button>
        </div>
      )}

      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}

      <style>{`
        .modal-overlay {
          position: fixed; left: 0; top: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.2); z-index: 1000; display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
          background: #fff; padding: 32px 24px; border-radius: 10px; min-width: 320px; box-shadow: 0 2px 16px #0002;
        }
        .btn { padding: 6px 16px; border-radius: 4px; border: none; background: #eee; cursor: pointer; }
        .btn-primary { background: #1976d2; color: #fff; }
        .btn-ghost { background: transparent; color: #1976d2; border: 1px solid #1976d2; }
        .btn:active { opacity: 0.8; }
        .btn:focus { outline: 2px solid #1976d2; }
        .barcode-table { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
        .table-head, .table-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; padding: 12px 16px; align-items: center; }
        .table-head { background: #f5f6fa; font-weight: 600; color: #4b5563; }
        .table-row:nth-child(even) { background: #f9fafb; }
        .table-row.empty { text-align: center; color: #6b7280; display: block; }
        .barcode-cell { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
        .info-cell { display: flex; flex-direction: column; gap: 4px; }
        .code-line { display: flex; align-items: center; gap: 8px; }
        .code-text { font-weight: 700; }
        @media (max-width: 720px) {
          .table-head, .table-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
