import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
} from 'lucide-react';
import { CityData } from '../types';
import { parseNumericValue } from '../utils/sheetParser';
import {
  aggregateByKategoriAndPokok,
  POKOK_MASALAH_LIST,
  JENIS_KATEGORI_LIST,
  PokokMasalahType,
  JenisKategoriType,
} from '../data/topikMasalahReference';

interface TopikMasalahBreakdownSectionProps {
  cities: CityData[];
  scopeLabel?: string;
  isLocationSelected?: boolean;
  onResetLocation?: () => void;
}

export default function TopikMasalahBreakdownSection({
  cities,
  scopeLabel = 'Keseluruhan Nasional',
  isLocationSelected = false,
  onResetLocation,
}: TopikMasalahBreakdownSectionProps) {
  const [selectedKategori, setSelectedKategori] = useState<'Semua' | JenisKategoriType>('Semua');
  const [selectedPokok, setSelectedPokok] = useState<'Semua' | PokokMasalahType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTopics, setShowAllTopics] = useState(false);

  const summary = useMemo(() => {
    return aggregateByKategoriAndPokok(cities, parseNumericValue);
  }, [cities]);

  const filteredTopikList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return summary.topikList.filter(item => {
      if (selectedKategori !== 'Semua' && item.jenisKategori !== selectedKategori) return false;
      if (selectedPokok !== 'Semua' && item.pokokMasalah !== selectedPokok) return false;
      if (q) {
        return (
          item.topikMasalah.toLowerCase().includes(q) ||
          item.pokokMasalah.toLowerCase().includes(q) ||
          item.jenisKategori.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [summary.topikList, selectedKategori, selectedPokok, searchQuery]);

  // Default: show only Top 10 Topik Masalah
  const displayedTopikList = useMemo(() => {
    if (showAllTopics || searchQuery.trim() !== '') {
      return filteredTopikList;
    }
    return filteredTopikList.slice(0, 10);
  }, [filteredTopikList, showAllTopics, searchQuery]);

  const filteredTotalCount = useMemo(() => {
    return filteredTopikList.reduce((acc, item) => acc + item.count, 0);
  }, [filteredTopikList]);

  const getPokokBadgeStyle = (pok: PokokMasalahType) => {
    if (pok === 'Administrasi') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (pok === 'Iuran') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getKategoriBadgeStyle = (kat: JenisKategoriType) => {
    if (kat === 'Informasi') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (kat === 'Permintaan') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div
      id="topik-masalah-reference-section"
      className="col-span-12 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 text-slate-800"
    >
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
            Data Layanan Berdasarkan Pengelompokan Kategori &amp; Pokok Masalah
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLocationSelected
              ? `Menampilkan 10 Top Topik Masalah untuk lokasi terpilih: ${scopeLabel}.`
              : 'Menampilkan 10 Top Topik Masalah keseluruhan. Pilih titik lokasi pada peta atau filter untuk melihat data per lokasi.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
              isLocationSelected
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${isLocationSelected ? 'text-rose-300' : 'text-rose-500'}`} />
            <span>{scopeLabel}</span>
          </span>

          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl font-mono">
            {filteredTotalCount.toLocaleString('id-ID')} Tiket
          </span>

          {isLocationSelected && onResetLocation && (
            <button
              type="button"
              onClick={onResetLocation}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Kembali ke 10 Top Topik Masalah Keseluruhan"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Lokasi</span>
            </button>
          )}
        </div>
      </div>

      {/* PEMILIHAN KATEGORI & POKOK MASALAH (SATU BARIS RINGKAS) */}
      <div className="flex items-center justify-between gap-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Pemilihan Kategori */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase mr-0.5">Kategori:</span>
            {(['Semua', ...JENIS_KATEGORI_LIST] as const).map(kat => {
              const count = kat === 'Semua' ? summary.totalAll : summary.byKategori[kat];
              return (
                <button
                  key={kat}
                  type="button"
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    selectedKategori === kat
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{kat}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      selectedKategori === kat
                        ? 'bg-indigo-800/70 text-indigo-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count.toLocaleString('id-ID')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-300 shrink-0" />

          {/* Pemilihan Pokok Masalah */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase mr-0.5">Pokok:</span>
            {(['Semua', ...POKOK_MASALAH_LIST] as const).map(pok => {
              const count = pok === 'Semua' ? summary.totalAll : summary.byPokokMasalah[pok];
              return (
                <button
                  key={pok}
                  type="button"
                  onClick={() => setSelectedPokok(pok)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    selectedPokok === pok
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{pok}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      selectedPokok === pok
                        ? 'bg-emerald-800/70 text-emerald-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count.toLocaleString('id-ID')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pencarian Topik Masalah */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs w-44 sm:w-52 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Topik Masalah..."
            className="w-full text-[11px] font-semibold text-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* TABEL DAFTAR TOP 10 JENIS TOPIK MASALAH */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5 w-12 text-center">Top</th>
                <th className="py-2.5 px-4">Jenis Topik Masalah</th>
                <th className="py-2.5 px-4">Pokok Masalah</th>
                <th className="py-2.5 px-4">Jenis Kategori</th>
                <th className="py-2.5 px-4 text-right">Jumlah Tiket</th>
                <th className="py-2.5 px-4 text-right">Proporsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedTopikList.length > 0 ? (
                displayedTopikList.map((item, idx) => (
                  <tr key={`${item.id}_${idx}`} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3.5 text-center">
                      <span
                        className={`inline-flex w-6 h-6 rounded-lg items-center justify-center font-mono font-bold text-[11px] ${
                          idx === 0
                            ? 'bg-amber-400 text-white shadow-2xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {item.topikMasalah}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getPokokBadgeStyle(
                          item.pokokMasalah
                        )}`}
                      >
                        {item.pokokMasalah}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getKategoriBadgeStyle(
                          item.jenisKategori
                        )}`}
                      >
                        {item.jenisKategori}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                      {item.count.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">
                      {item.percentageOfTotal}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    Tidak ada topik masalah yang sesuai dengan filter pilihan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTopikList.length > 10 && !searchQuery.trim() && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Menampilkan <strong>{displayedTopikList.length}</strong> Top Topik Masalah dari total{' '}
              <strong>{filteredTopikList.length}</strong> Topik Referensi ({scopeLabel})
            </span>
            <button
              type="button"
              onClick={() => setShowAllTopics(!showAllTopics)}
              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>
                {showAllTopics
                  ? 'Tampilkan 10 Top Saja'
                  : `Lihat Semua (${filteredTopikList.length} Topik)`}
              </span>
              {showAllTopics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
