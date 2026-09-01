import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Settings2, Database, Link as LinkIcon, FileText, Map, PieChart, Ticket, BarChart3, LayoutTemplate, AlertCircle, Sparkles } from 'lucide-react';
import { FilterReference, MapSyncConfig, CityData } from '../types';

interface ReferenceManagerProps {
  references: FilterReference[];
  onReferencesChange: (refs: FilterReference[]) => void;
  mapSyncConfig?: MapSyncConfig;
  citiesData?: CityData[];
}

export default function ReferenceManager({ references, onReferencesChange, mapSyncConfig, citiesData }: ReferenceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FilterReference>>({});
  
  // Extract columns from synchronized data
  const availableColumns = useMemo(() => {
    const colSet = new Set<string>();
    if (citiesData && citiesData.length > 0) {
      citiesData.forEach(c => {
        if (c.rawRow && typeof c.rawRow === 'object') {
          Object.keys(c.rawRow).forEach(k => colSet.add(k));
        }
      });
    }
    return Array.from(colSet);
  }, [citiesData]);

  const isSynced = Boolean(mapSyncConfig?.isSynced && availableColumns.length > 0);

  const handleAdd = () => {
    const newRef: FilterReference = {
      id: `ref_${Date.now()}`,
      name: 'Filter Baru',
      columnName: availableColumns[0] || '',
      manualItems: [],
      placements: ['map'],
      showIndicator: false,
      indicatorLabel: ''
    };
    onReferencesChange([...references, newRef]);
    setEditingId(newRef.id);
    setEditForm(newRef);
  };

  const handleDelete = (id: string) => {
    onReferencesChange(references.filter(r => r.id !== id));
  };

  const handleSave = () => {
    if (!editingId) return;
    onReferencesChange(references.map(r => r.id === editingId ? { ...r, ...editForm } as FilterReference : r));
    setEditingId(null);
  };

  const PLACEMENT_OPTIONS = [
    { id: 'map', label: 'Peta Layanan', icon: <Map className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Analitik', icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: 'tickets', label: 'Antrean Laporan', icon: <Ticket className="w-3.5 h-3.5" /> },
    { id: 'custom-charts', label: 'Visualisasi Kustom', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'sms', label: 'SMS (Super Mind Senada)', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-emerald-600 h-5 w-5" />
            Manajemen Referensi Filter
          </h3>
          <p className="text-xs text-slate-500">
            Kelola ketentuan referensi filter, pilih kolom acuan dari sinkronisasi Google Sheet, dan tentukan letak menu halaman.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Referensi
        </button>
      </div>

      {!isSynced && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-xs shadow-3xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Peringatan Sinkronisasi:</strong> Data Google Sheet belum disinkronkan. Kolom referensi pada filter akan dinonaktifkan (disable) hingga sinkronisasi data dilakukan di menu Peta / Pengaturan Data.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {references.map(ref => (
          <div key={ref.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {editingId === ref.id ? (
              <div className="p-5 space-y-4">
                
                {/* 1. NAMA FILTER (Isi Manual) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Filter (Isi Manual)</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Contoh: KEPWIL, Jenis Layanan, Kategori"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. KOLOM REFERENSI GOOGLE SHEET */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kolom Referensi Google Sheet / Data Sinkron</label>
                    {isSynced || availableColumns.length > 0 ? (
                      <select
                        value={editForm.columnName || (editForm.id === 'ref_kepwil' ? mapSyncConfig?.kepwilColumn : '') || ''}
                        onChange={e => setEditForm({ ...editForm, columnName: e.target.value })}
                        className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      >
                        <option value="">-- Pilih Kolom dari Google Sheet --</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>
                            {col === mapSyncConfig?.kepwilColumn ? '🏛️ (Acuan KEPWIL) ' : '📊 '} {col}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        disabled
                        className="w-full text-sm border-slate-200 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
                      >
                        <option value="">Belum Sinkronisasi Data (Disable)</option>
                      </select>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isSynced || availableColumns.length > 0
                        ? `Tersedia ${availableColumns.length} kolom dari data tersinkron.${mapSyncConfig?.kepwilColumn ? ` Kolom KEPWIL terdeteksi: "${mapSyncConfig.kepwilColumn}".` : ''}`
                        : 'Sinkronkan Google Sheet terlebih dahulu untuk mengaktifkan pilihan kolom.'}
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 3. TAMPILKAN PADA MENU (Dropdown) */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">Tampilkan pada Menu</label>
                  <select
                    value={editForm.placements?.[0] || 'map'}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, placements: val ? [val] : [] });
                    }}
                    className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">-- Pilih Halaman Menu --</option>
                    {PLACEMENT_OPTIONS.map(po => (
                      <option key={po.id} value={po.id}>{po.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Setelah memilih salah satu menu, filter akan otomatis muncul di tampilan halaman tersebut.
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.showIndicator || false}
                        onChange={e => setEditForm({ ...editForm, showIndicator: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        id={`indicator-${ref.id}`}
                      />
                      <label htmlFor={`indicator-${ref.id}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                        Buat Indikator Visual / Metrik
                      </label>
                    </div>
                    {editForm.showIndicator && (
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Label Indikator (opsional)</label>
                        <input
                          type="text"
                          value={editForm.indicatorLabel || ''}
                          onChange={e => setEditForm({ ...editForm, indicatorLabel: e.target.value })}
                          className="w-full text-xs border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Contoh: Total Wilayah Aktif"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                    Simpan Perubahan
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 flex flex-col h-full relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Database className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{ref.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {isSynced ? '🟢 Sinkron' : '🟡 Belum Sinkron'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button onClick={() => { setEditingId(ref.id); setEditForm(ref); }} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Edit Referensi">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(ref.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Kolom Sheet:</span>
                      <span className="font-semibold text-slate-700">{ref.columnName || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PLACEMENT_OPTIONS.filter(po => (ref.placements || []).includes(po.id)).map(po => (
                      <span key={po.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg">
                        {po.icon}
                        {po.label}
                      </span>
                    ))}
                    {(!ref.placements || ref.placements.length === 0) && (
                      <span className="text-[10px] font-medium text-slate-400 italic">Belum ditempatkan di menu manapun</span>
                    )}
                  </div>

                  {ref.showIndicator && (
                    <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                        <LayoutTemplate className="w-3.5 h-3.5 text-amber-500" />
                        Indikator Aktif:
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ref.indicatorLabel || 'Tanpa Label'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {references.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border border-slate-200 border-dashed rounded-2xl">
            <Settings2 className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-800 text-sm mb-1">Belum Ada Referensi</h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">Buat kelompok filter baru untuk digunakan di seluruh modul aplikasi.</p>
            <button onClick={handleAdd} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Referensi Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
