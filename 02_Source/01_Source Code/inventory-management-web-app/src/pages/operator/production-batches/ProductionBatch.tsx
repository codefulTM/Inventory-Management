/**
 * Standalone API Test Page for Production Batch & Batch Component
 * Access: /api-test/batches  (no login required)
 *
 * Covers all endpoints:
 *   GET    /production-batches
 *   GET    /production-batches/status/:status
 *   GET    /production-batches/product/:productId
 *   GET    /production-batches/:id
 *   POST   /production-batches
 *   PATCH  /production-batches/:id
 *   DELETE /production-batches/:id
 *   GET    /production-batches/:id/components
 *   POST   /production-batches/:id/components
 *   PATCH  /production-batches/:id/components/:componentId
 *   DELETE /production-batches/:id/components/:componentId
 */

import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API = 'http://localhost:3000';

// ── helpers ──────────────────────────────────────────────────────────────────
async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (e: unknown) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

const statusColors: Record<string, string> = {
  'In Progress': 'bg-blue-100 text-blue-700',
  Complete: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
};

// ── sub-components ────────────────────────────────────────────────────────────
function JsonBox({ data }: { data: unknown }) {
  return (
    <pre className="bg-gray-950 text-green-300 text-xs p-4 rounded-xl overflow-x-auto max-h-72 leading-relaxed">
      {JSON.stringify(data, null, 2) as string}
    </pre>
  );
}

function SectionTitle({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">{title}</h2>
      {badge && (
        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase">
          {badge}
        </span>
      )}
    </div>
  );
}

function Btn({
  label,
  onClick,
  color = 'blue',
  loading = false,
}: {
  label: string;
  onClick: () => void;
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'gray';
  loading?: boolean;
}) {
  const cls = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    red: 'bg-red-500 hover:bg-red-600 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    gray: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
  }[color];
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-xs font-black transition-all disabled:opacity-40 ${cls}`}
    >
      {loading ? '...' : label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
      />
    </div>
  );
}

// ── Section: List Batches ─────────────────────────────────────────────────────
function SectionList({
  onSelect,
  refreshKey,
}: {
  onSelect: (id: string) => void;
  refreshKey: number;
}) {
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState('1');
  const [limit, setLimit] = useState('20');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    let path = `/production-batches?page=${page}&limit=${limit}`;
    if (statusFilter) path = `/production-batches/status/${encodeURIComponent(statusFilter)}?page=${page}&limit=${limit}`;
    if (productFilter) path = `/production-batches/product/${encodeURIComponent(productFilter)}?page=${page}&limit=${limit}`;
    const r = await call('GET', path);
    setResult(r);
    setLoading(false);
  }, [page, limit, statusFilter, productFilter, refreshKey]); // eslint-disable-line

  const batches: unknown[] =
    result && typeof result === 'object' && (result as any).data?.data
      ? (result as any).data.data
      : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <SectionTitle title="List Batches" badge="GET" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Page" value={page} onChange={setPage} type="number" />
        <Field label="Limit" value={limit} onChange={setLimit} type="number" />
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setProductFilter(''); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
          >
            <option value="">— All statuses —</option>
            <option>In Progress</option>
            <option>Complete</option>
            <option>On Hold</option>
            <option>Cancelled</option>
          </select>
        </div>
        <Field label="Filter by product_id" value={productFilter} onChange={(v) => { setProductFilter(v); setStatusFilter(''); }} placeholder="e.g. PROD-001" />
      </div>

      <div className="flex gap-2">
        <Btn label="GET /production-batches" onClick={run} loading={loading} />
        <Btn label="Clear" onClick={() => setResult(null)} color="gray" />
      </div>

      {batches.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['batch_number', 'product_id', 'batch_size', 'unit_of_measure', 'status', 'batch_id', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-left font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {batches.map((b: any) => (
                <tr key={b.batch_id} className="border-t border-gray-50 hover:bg-indigo-50/30">
                  <td className="px-3 py-2 font-bold text-indigo-700">{b.batch_number}</td>
                  <td className="px-3 py-2 font-mono">{b.product_id}</td>
                  <td className="px-3 py-2">{b.batch_size}</td>
                  <td className="px-3 py-2">{b.unit_of_measure}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${statusColors[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-400 text-[10px] max-w-[120px] truncate" title={b.batch_id}>
                    {b.batch_id}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onSelect(b.batch_id)}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black hover:bg-indigo-200"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!result && <JsonBox data={result} />}
    </div>
  );
}

// ── Section: Create Batch ─────────────────────────────────────────────────────
function SectionCreate({ onCreated }: { onCreated: (id: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const twoYears = new Date(Date.now() + 2 * 365 * 86400000).toISOString().slice(0, 10);

  const [f, setF] = useState({
    batch_id: uuidv4(),
    product_id: 'PROD-001',
    batch_number: `PB-${Date.now()}`,
    unit_of_measure: 'units',
    manufacture_date: today,
    expiration_date: twoYears,
    status: 'In Progress',
    batch_size: '1000',
  });
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const run = async () => {
    setLoading(true);
    const payload = { ...f, batch_size: Number(f.batch_size) };
    const r = await call('POST', '/production-batches', payload);
    setResult(r);
    setLoading(false);
    if (r.ok && (r.data as any)?.batch_id) {
      onCreated((r.data as any).batch_id);
      setF((prev) => ({ ...prev, batch_id: uuidv4(), batch_number: `PB-${Date.now()}` }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <SectionTitle title="Create Batch" badge="POST" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-4 flex items-end gap-2">
          <div className="flex-1">
            <Field label="batch_id (UUID v4)" value={f.batch_id} onChange={(v) => set('batch_id', v)} />
          </div>
          <button
            onClick={() => set('batch_id', uuidv4())}
            className="mb-0.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black text-gray-600"
          >
            New UUID
          </button>
        </div>
        <Field label="batch_number" value={f.batch_number} onChange={(v) => set('batch_number', v)} />
        <Field label="product_id" value={f.product_id} onChange={(v) => set('product_id', v)} placeholder="e.g. PROD-001" />
        <Field label="batch_size (number)" value={f.batch_size} onChange={(v) => set('batch_size', v)} type="number" />
        <Field label="unit_of_measure (max 10)" value={f.unit_of_measure} onChange={(v) => set('unit_of_measure', v)} placeholder="units / kg / mg" />
        <Field label="manufacture_date" value={f.manufacture_date} onChange={(v) => set('manufacture_date', v)} type="date" />
        <Field label="expiration_date" value={f.expiration_date} onChange={(v) => set('expiration_date', v)} type="date" />
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            status
          </label>
          <select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
          >
            <option>In Progress</option>
            <option>Complete</option>
            <option>On Hold</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-gray-50 rounded-xl font-mono text-[11px] text-gray-500">
        POST /production-batches → body: {JSON.stringify({ ...f, batch_size: Number(f.batch_size) })}
      </div>

      <Btn label="POST /production-batches" onClick={run} loading={loading} color="green" />
      {!!result && <JsonBox data={result} />}
    </div>
  );
}

// ── Section: Get / Update / Delete Batch ─────────────────────────────────────
function SectionGetUpdateDelete({
  selectedId,
  onChange,
}: {
  selectedId: string;
  onChange: () => void;
}) {
  const [batchId, setBatchId] = useState(selectedId);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [updateFields, setUpdateFields] = useState({
    status: 'Complete',
    batch_size: '',
    unit_of_measure: '',
  });

  // Sync when parent selects from table
  if (selectedId !== batchId && selectedId) {
    setBatchId(selectedId);
    setResult(null);
  }

  const setU = (k: string, v: string) => setUpdateFields((prev) => ({ ...prev, [k]: v }));

  const runGet = async () => {
    if (!batchId) return;
    setLoading(true);
    const r = await call('GET', `/production-batches/${batchId}`);
    setResult(r);
    setLoading(false);
  };

  const runPatch = async () => {
    if (!batchId) return;
    setLoading(true);
    const body: Record<string, unknown> = { status: updateFields.status };
    if (updateFields.batch_size) body.batch_size = Number(updateFields.batch_size);
    if (updateFields.unit_of_measure) body.unit_of_measure = updateFields.unit_of_measure;
    const r = await call('PATCH', `/production-batches/${batchId}`, body);
    setResult(r);
    setLoading(false);
    if (r.ok) onChange();
  };

  const runDelete = async () => {
    if (!batchId || !confirm(`Delete batch ${batchId}?`)) return;
    setLoading(true);
    const r = await call('DELETE', `/production-batches/${batchId}`);
    setResult(r);
    setLoading(false);
    if (r.ok) { setBatchId(''); onChange(); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <SectionTitle title="Get / Update / Delete Batch" badge="GET · PATCH · DELETE" />

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Field label="batch_id (UUID)" value={batchId} onChange={setBatchId} placeholder="paste or select from list above" />
        </div>
        <Btn label="GET" onClick={runGet} loading={loading} />
        <Btn label="DELETE" onClick={runDelete} loading={loading} color="red" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
          PATCH fields (only filled fields are sent)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              new status
            </label>
            <select
              value={updateFields.status}
              onChange={(e) => setU('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
            >
              <option>In Progress</option>
              <option>Complete</option>
              <option>On Hold</option>
              <option>Cancelled</option>
            </select>
          </div>
          <Field label="new batch_size" value={updateFields.batch_size} onChange={(v) => setU('batch_size', v)} type="number" placeholder="optional" />
          <Field label="new unit_of_measure" value={updateFields.unit_of_measure} onChange={(v) => setU('unit_of_measure', v)} placeholder="optional" />
        </div>
        <div className="mt-3">
          <Btn label="PATCH /production-batches/:id" onClick={runPatch} loading={loading} color="yellow" />
        </div>
      </div>

      {!!result && <JsonBox data={result} />}
    </div>
  );
}

// ── Section: BatchComponents ──────────────────────────────────────────────────
function SectionComponents({ batchId: propBatchId }: { batchId: string }) {

  const [batchId, setBatchId] = useState(propBatchId);
  const [components, setComponents] = useState<unknown[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');

  if (propBatchId !== batchId && propBatchId) {
    setBatchId(propBatchId);
    setComponents([]);
    setResult(null);
    setBatchStatus('');
  }

  const [newComp, setNewComp] = useState({
    lot_id: uuidv4(),
    planned_quantity: '100',
    actual_quantity: '',
    unit_of_measure: 'kg',
    added_by: 'tester',
  });
  const [updateComp, setUpdateComp] = useState({
    componentId: '',
    actual_quantity: '',
    unit_of_measure: '',
  });

  const setN = (k: string, v: string) => setNewComp((p) => ({ ...p, [k]: v }));
  const setUC = (k: string, v: string) => setUpdateComp((p) => ({ ...p, [k]: v }));

  // Fetch batch status when batchId changes
  React.useEffect(() => {
    if (!batchId) return;
    (async () => {
      const r = await call('GET', `/production-batches/${batchId}`);
      if (r.ok && r.data && typeof r.data === 'object' && 'status' in r.data) {
        setBatchStatus((r.data as any).status);
      } else {
        setBatchStatus('');
      }
    })();
  }, [batchId]);

  const runListComponents = async () => {
    if (!batchId) return;
    setLoading(true);
    const r = await call('GET', `/production-batches/${batchId}/components`);
    setResult(r);
    setLoading(false);
    if (r.ok && Array.isArray(r.data)) setComponents(r.data);
  };

  const runAddComponent = async () => {
    if (!batchId) return;
    setLoading(true);
    const body: Record<string, unknown> = {
      lot_id: newComp.lot_id,
      planned_quantity: Number(newComp.planned_quantity),
      unit_of_measure: newComp.unit_of_measure,
      added_by: newComp.added_by || undefined,
    };
    if (newComp.actual_quantity) body.actual_quantity = Number(newComp.actual_quantity);
    const r = await call('POST', `/production-batches/${batchId}/components`, body);
    setResult(r);
    setLoading(false);
    if (r.ok) runListComponents();
  };

  const runUpdateComponent = async () => {
    if (!batchId || !updateComp.componentId) return;
    setLoading(true);
    const body: Record<string, unknown> = {};
    if (updateComp.actual_quantity) body.actual_quantity = Number(updateComp.actual_quantity);
    if (updateComp.unit_of_measure) body.unit_of_measure = updateComp.unit_of_measure;
    const r = await call('PATCH', `/production-batches/${batchId}/components/${updateComp.componentId}`, body);
    setResult(r);
    setLoading(false);
    if (r.ok) runListComponents();
  };

  const runDeleteComponent = async (componentId: string) => {
    if (!confirm(`Delete component ${componentId}?`)) return;
    setLoading(true);
    const r = await call('DELETE', `/production-batches/${batchId}/components/${componentId}`);
    setResult(r);
    setLoading(false);
    if (r.ok) runListComponents();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <SectionTitle title="Batch Components" badge="nested CRUD" />

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Field label="batch_id" value={batchId} onChange={setBatchId} placeholder="paste UUID of batch" />
        </div>
        <Btn label="GET components" onClick={runListComponents} loading={loading} />
      </div>

      {/* Show batch status */}
      {batchStatus && (
        <div className="text-xs font-mono mb-2">
          <span className="font-bold">Batch status:</span> <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-gray-100">{batchStatus}</span>
        </div>
      )}

      {/* Components table */}
      {components.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['component_id', 'lot_id', 'planned_qty', 'actual_qty', 'unit', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((c: any) => (
                <tr key={c.component_id} className="border-t border-gray-50 hover:bg-indigo-50/30">
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-400 max-w-[100px] truncate" title={c.component_id}>{c.component_id}</td>
                  <td className="px-3 py-2 font-mono text-[10px] max-w-[100px] truncate" title={c.lot_id}>{c.lot_id}</td>
                  <td className="px-3 py-2 font-bold">{c.planned_quantity}</td>
                  <td className="px-3 py-2">{c.actual_quantity ?? '—'}</td>
                  <td className="px-3 py-2">{c.unit_of_measure}</td>
                  <td className="px-3 py-2 flex gap-1">
                    <button
                      onClick={() => setUC('componentId', c.component_id)}
                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-black text-[10px] hover:bg-yellow-200"
                      disabled={batchStatus !== 'On Hold'}
                    >
                      Select
                    </button>
                    <button
                      onClick={() => runDeleteComponent(c.component_id)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded font-black text-[10px] hover:bg-red-200"
                      disabled={batchStatus !== 'On Hold'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add component */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          POST /:id/components — Add Component
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-bold">
          ⚠ lot_id must exist in MongoDB (InventoryLot collection). Seed one first or use an existing lot_id.
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-3 flex items-end gap-2">
            <div className="flex-1">
              <Field label="lot_id (UUID — must exist in inventory-lots)" value={newComp.lot_id} onChange={(v) => setN('lot_id', v)} />
            </div>
            <button onClick={() => setN('lot_id', uuidv4())} className="mb-0.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black text-gray-600">
              New UUID
            </button>
          </div>
          <Field label="planned_quantity" value={newComp.planned_quantity} onChange={(v) => setN('planned_quantity', v)} type="number" />
          <Field label="actual_quantity (optional)" value={newComp.actual_quantity} onChange={(v) => setN('actual_quantity', v)} type="number" placeholder="optional" />
          <Field label="unit_of_measure (max 10)" value={newComp.unit_of_measure} onChange={(v) => setN('unit_of_measure', v)} />
          <Field label="added_by (optional)" value={newComp.added_by} onChange={(v) => setN('added_by', v)} />
        </div>
        <Btn label="POST /:id/components" onClick={runAddComponent} loading={loading} color="green" />
      </div>

      {/* Update component */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          PATCH /:id/components/:componentId
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="component_id (select from table above)" value={updateComp.componentId} onChange={(v) => setUC('componentId', v)} placeholder="paste or click Select in table" />
          </div>
          <Field label="new actual_quantity" value={updateComp.actual_quantity} onChange={(v) => setUC('actual_quantity', v)} type="number" placeholder="optional" />
          <Field label="new unit_of_measure" value={updateComp.unit_of_measure} onChange={(v) => setUC('unit_of_measure', v)} placeholder="optional" />
        </div>
        <Btn label="PATCH component" onClick={runUpdateComponent} loading={loading} color="yellow" />
      </div>

      {!!result && <JsonBox data={result} />}
    </div>
  );
}

// ── Section: Seed ─────────────────────────────────────────────────────────────
function SectionSeedInventoryLot({ onSeeded }: { onSeeded: (lotId: string) => void }) {
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    lot_id: uuidv4(),
    material_id: 'MAT-001',
    manufacturer_name: 'Acme Pharma',
    manufacturer_lot: 'MFR-LOT-001',
    received_date: new Date().toISOString().slice(0, 10),
    expiration_date: new Date(Date.now() + 2 * 365 * 86400000).toISOString().slice(0, 10),
    status: 'Accepted',
    quantity: 5000,
    unit_of_measure: 'kg',
    is_sample: false,
  });
  const set = (k: string, v: unknown) => setF((p: any) => ({ ...p, [k]: v }));

  const run = async () => {
    setLoading(true);
    const r = await call('POST', '/inventory-lots', f);
    setResult(r);
    setLoading(false);
    if (r.ok) onSeeded(f.lot_id);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 space-y-4">
      <SectionTitle title="Seed Inventory Lot (prerequisite for components)" badge="POST /inventory-lots" />
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
        BatchComponent.lot_id must reference a valid InventoryLot. Use this to seed one first.
        Note: requires InventoryLotService to be connected to MongoDB (not stubbed).
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-4 flex items-end gap-2">
          <div className="flex-1">
            <Field label="lot_id (UUID)" value={f.lot_id} onChange={(v) => set('lot_id', v)} />
          </div>
          <button onClick={() => set('lot_id', uuidv4())} className="mb-0.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black text-gray-600">
            New UUID
          </button>
        </div>
        <Field label="material_id" value={f.material_id} onChange={(v) => set('material_id', v)} placeholder="MAT-001" />
        <Field label="manufacturer_name" value={f.manufacturer_name} onChange={(v) => set('manufacturer_name', v)} />
        <Field label="manufacturer_lot" value={f.manufacturer_lot} onChange={(v) => set('manufacturer_lot', v)} />
        <Field label="quantity" value={String(f.quantity)} onChange={(v) => set('quantity', Number(v))} type="number" />
        <Field label="unit_of_measure" value={f.unit_of_measure} onChange={(v) => set('unit_of_measure', v)} />
        <Field label="received_date" value={f.received_date} onChange={(v) => set('received_date', v)} type="date" />
        <Field label="expiration_date" value={f.expiration_date} onChange={(v) => set('expiration_date', v)} type="date" />
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">status</label>
          <select
            value={f.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
          >
            <option>Quarantine</option>
            <option>Accepted</option>
            <option>Rejected</option>
            <option>Depleted</option>
          </select>
        </div>
      </div>

      <Btn label="POST /inventory-lots" onClick={run} loading={loading} color="green" />
      {!!result && <JsonBox data={result} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApiTestProductionBatch() {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [seededLotId, setSeededLotId] = useState('');

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-gray-900 rounded-2xl p-6 flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
            API Test Console
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Production Batch API Tester
          </h1>
          <p className="text-gray-400 text-xs mt-1 font-mono">
            {`http://localhost:3000/production-batches`}
          </p>
        </div>
        <div className="text-right space-y-1">
          {selectedBatchId && (
            <div className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-black text-white font-mono">
              Selected: {selectedBatchId.slice(0, 8)}…
            </div>
          )}
          {seededLotId && (
            <div className="px-3 py-1.5 bg-green-700 rounded-lg text-[10px] font-black text-white font-mono">
              Seeded lot_id: {seededLotId.slice(0, 8)}…
            </div>
          )}
        </div>
      </div>

      {/* Endpoint map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">All Endpoints</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono text-gray-500">
          {[
            ['GET', '/production-batches?page=&limit='],
            ['GET', '/production-batches/status/:status'],
            ['GET', '/production-batches/product/:productId'],
            ['GET', '/production-batches/:id'],
            ['POST', '/production-batches'],
            ['PATCH', '/production-batches/:id'],
            ['DELETE', '/production-batches/:id'],
            ['GET', '/production-batches/:id/components'],
            ['POST', '/production-batches/:id/components'],
            ['PATCH', '/production-batches/:id/components/:componentId'],
            ['DELETE', '/production-batches/:id/components/:componentId'],
            ['POST', '/inventory-lots  (seed prerequisite)'],
          ].map(([m, p]) => (
            <div key={p} className="flex items-center gap-2">
              <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                m === 'GET' ? 'bg-blue-100 text-blue-700' :
                m === 'POST' ? 'bg-green-100 text-green-700' :
                m === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {m}
              </span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <SectionSeedInventoryLot onSeeded={(id) => { setSeededLotId(id); refresh(); }} />
      <SectionCreate onCreated={(id) => { setSelectedBatchId(id); refresh(); }} />
      <SectionList
        onSelect={(id) => setSelectedBatchId(id)}
        refreshKey={refreshKey}
      />
      <SectionGetUpdateDelete
        selectedId={selectedBatchId}
        onChange={refresh}
      />
      <SectionComponents batchId={selectedBatchId} />
    </div>
  );
}
