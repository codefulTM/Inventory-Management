/**
 * BarcodeManager — Operator page
 * Tạo barcode gắn với Inventory Lot đã được Accepted
 * Hỗ trợ: in ảnh barcode, copy mã, tra cứu mã
 */

import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  Barcode,
  Copy,
  Check,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  PackageCheck,
} from "lucide-react";
import { fetchInventoryLots } from "../../services/inventoryLotService";
import { fetchMaterials } from "../../services/materialService";
import type { InventoryLot } from "../../types/inventory";
import type { Material } from "../../types/material";

// ─── Barcode SVG component ────────────────────────────────────────────

function BarcodeSVG({ value, label }: { value: string; label?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 12,
        margin: 10,
        width: 2,
        height: 60,
        fontOptions: "bold",
        textMargin: 4,
      });
    } catch (e) {
      console.error("Barcode generation error:", e);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg ref={svgRef} className="max-w-full" />
      {label && (
        <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
      )}
    </div>
  );
}

// ─── Print Modal ──────────────────────────────────────────────────────

interface PrintModalProps {
  lot: InventoryLot;
  material: Material | undefined;
  barcodeValue: string;
  onClose: () => void;
}

function PrintModal({ lot, material, barcodeValue, onClose }: PrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=600,height=500");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode - ${barcodeValue}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .label { border: 2px solid #333; padding: 16px; display: inline-block; max-width: 400px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            td { padding: 3px 6px; }
            td:first-child { font-weight: bold; color: #555; white-space: nowrap; }
            svg { display: block; margin: 0 auto; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Printer size={20} className="text-blue-600" />
            In Barcode
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div ref={printRef} className="label border-2 border-gray-300 rounded-lg p-4">
          <p className="text-center font-black text-sm text-gray-800 mb-3 uppercase">
            {material?.material_name || lot.material_id}
          </p>
          <BarcodeSVG value={barcodeValue} />
          <table className="w-full text-xs mt-3">
            <tbody>
              <tr>
                <td className="font-bold text-gray-500">Lot ID:</td>
                <td className="text-gray-800">{lot.lot_id}</td>
              </tr>
              <tr>
                <td className="font-bold text-gray-500">Mfr Lot:</td>
                <td className="text-gray-800">{lot.manufacturer_lot}</td>
              </tr>
              <tr>
                <td className="font-bold text-gray-500">Nhà sản xuất:</td>
                <td className="text-gray-800">{lot.manufacturer_name}</td>
              </tr>
              <tr>
                <td className="font-bold text-gray-500">Số lượng:</td>
                <td className="text-gray-800">{lot.quantity} {lot.unit_of_measure}</td>
              </tr>
              <tr>
                <td className="font-bold text-gray-500">Hạn dùng:</td>
                <td className="text-gray-800">
                  {lot.expiration_date
                    ? new Date(lot.expiration_date).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-gray-500">Vị trí:</td>
                <td className="text-gray-800">{lot.storage_location || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Printer size={14} />
            In ngay
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Barcode Card ─────────────────────────────────────────────────────

interface BarcodeCardProps {
  lot: InventoryLot;
  material: Material | undefined;
}

function BarcodeCard({ lot, material }: BarcodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Barcode value: lot_id as the canonical barcode
  const barcodeValue = lot.lot_id;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(barcodeValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("input");
      el.value = barcodeValue;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {showPrint && (
        <PrintModal
          lot={lot}
          material={material}
          barcodeValue={barcodeValue}
          onClose={() => setShowPrint(false)}
        />
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">
              {material?.material_name || lot.material_id}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{lot.lot_id}</p>
          </div>
          <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            Accepted
          </span>
        </div>

        {/* Barcode */}
        <div className="px-4 py-4">
          <BarcodeSVG value={barcodeValue} />
        </div>

        {/* Actions */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              copied
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Đã copy!" : "Copy mã"}
          </button>
          <button
            onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <Printer size={13} />
            In barcode
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-bold transition"
          >
            Chi tiết {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Detail expand */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <table className="w-full text-xs">
              <tbody className="space-y-1">
                {[
                  ["Mfr Lot", lot.manufacturer_lot],
                  ["Nhà sản xuất", lot.manufacturer_name],
                  ["Nhà cung cấp", lot.supplier_name || "—"],
                  ["Số lượng", `${lot.quantity} ${lot.unit_of_measure}`],
                  [
                    "Ngày nhận",
                    lot.received_date
                      ? new Date(lot.received_date).toLocaleDateString("vi-VN")
                      : "—",
                  ],
                  [
                    "Hạn dùng",
                    lot.expiration_date
                      ? new Date(lot.expiration_date).toLocaleDateString("vi-VN")
                      : "—",
                  ],
                  ["Vị trí", lot.storage_location || "—"],
                  ["Material type", material?.material_type || "—"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1 pr-3 font-bold text-gray-500 whitespace-nowrap w-32">{k}</td>
                    <td className="py-1 text-gray-700">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Lookup Tab ───────────────────────────────────────────────────────

function LookupTab({
  lots,
  materials,
}: {
  lots: InventoryLot[];
  materials: Material[];
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<InventoryLot | null | "not_found">(null);

  const handleLookup = () => {
    const q = query.trim();
    if (!q) return;
    const found = lots.find(
      (l) =>
        l.lot_id === q ||
        l.lot_id.toLowerCase().includes(q.toLowerCase()) ||
        l.manufacturer_lot?.toLowerCase().includes(q.toLowerCase()),
    );
    setResult(found || "not_found");
  };

  const mat =
    result && result !== "not_found"
      ? materials.find((m) => m.material_id === result.material_id)
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Nhập Lot ID hoặc Manufacturer Lot..."
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleLookup}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700"
        >
          Tra cứu
        </button>
        {result && (
          <button
            onClick={() => {
              setResult(null);
              setQuery("");
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {result === "not_found" && (
        <div className="p-6 text-center bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 font-bold">Không tìm thấy lot nào khớp với "{query}"</p>
          <p className="text-sm text-red-400 mt-1">Hãy kiểm tra lại Lot ID hoặc Manufacturer Lot</p>
        </div>
      )}

      {result && result !== "not_found" && (
        <div className="max-w-sm">
          <BarcodeCard lot={result} material={mat} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function BarcodeManager() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"browse" | "lookup">("browse");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [allLots, allMats] = await Promise.all([
          fetchInventoryLots(),
          fetchMaterials(),
        ]);
        // Only lots with status "Accepted"
        setLots(allLots.filter((l) => l.status === "Accepted"));
        setMaterials(allMats);
      } catch (e: any) {
        setError(e.message || "Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = lots.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const mat = materials.find((m) => m.material_id === l.material_id);
    return (
      l.lot_id.toLowerCase().includes(q) ||
      l.manufacturer_lot?.toLowerCase().includes(q) ||
      mat?.material_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Barcode size={24} className="text-blue-600" />
            Quản lý Barcode
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tạo và in barcode cho các Inventory Lot đã được chấp nhận (Accepted)
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {lots.length} lots available
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("browse")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${
            tab === "browse"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
          }`}
        >
          <PackageCheck size={14} />
          Duyệt Lots
        </button>
        <button
          onClick={() => setTab("lookup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition ${
            tab === "lookup"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
          }`}
        >
          <Search size={14} />
          Tra cứu mã
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && tab === "lookup" && (
        <LookupTab lots={lots} materials={materials} />
      )}

      {!loading && tab === "browse" && (
        <>
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, lot ID..."
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {lots.length === 0 && !error && (
            <div className="text-center py-20 text-gray-300">
              <Barcode size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-gray-400">
                Không có Inventory Lot nào ở trạng thái Accepted
              </p>
            </div>
          )}

          {filtered.length === 0 && lots.length > 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Không tìm thấy kết quả cho "{search}"
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((lot) => {
              const mat = materials.find((m) => m.material_id === lot.material_id);
              return <BarcodeCard key={lot.lot_id} lot={lot} material={mat} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
