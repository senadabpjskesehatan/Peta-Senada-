import { useState, useMemo, ChangeEvent, useEffect, useRef } from 'react';
import { MapPin, RotateCw, Database, FileSpreadsheet, AlertCircle, CheckCircle, HelpCircle, X, Info, ArrowUpRight, Award, UploadCloud, Globe, FileUp, SlidersHorizontal, Layers, Table, Settings2, Save, Compass, Maximize2, Minimize2, Map as MapIcon, Eye, Search, Trophy, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CityData, MapSyncConfig } from '../types';
import { fetchSheetData, extractSpreadsheetId, parseCSV, parseNumericValue } from '../utils/sheetParser';
import { DEFAULT_CITIES, SAMPLE_SHEETS_CSV } from '../data/defaultData';
import { INDONESIAN_CITIES_COORDINATES, findCityCoordinates, getIslandForCity } from '../data/indonesiaCoordinates';

interface IndonesiaMapProps {
  onCitiesDataChange: (cities: CityData[]) => void;
  currentCities: CityData[];
  isAdmin?: boolean;
  onRequestAdminLogin?: () => void;
}


export default function IndonesiaMap({ onCitiesDataChange, currentCities, isAdmin = false, onRequestAdminLogin }: IndonesiaMapProps) {
  const [syncConfig, setSyncConfig] = useState<MapSyncConfig>({
    sheetUrl: '',
    sheetId: '',
    cityColumn: '', // This will hold the KC column mapping
    informasiColumn: '',
    permintaanColumn: '',
    pengaduanColumn: '',
    slaColumn: '',
    isSynced: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [sheetRawRows, setSheetRawRows] = useState<any[]>([]);
  const [availableSheets, setAvailableSheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  
  // File upload state for CSV / Excel files
  const [syncSourceMode, setSyncSourceMode] = useState<'url' | 'file'>('url');
  const [uploadedWorkbook, setUploadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Modal toggle state for sheets sync config
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Volume indicator thresholds state (< 500 rendah, 501 - 2500 sedang, 2501 - 5000 tinggi, > 5000 sangat tinggi)
  const [volumeThresholds, setVolumeThresholds] = useState({
    rendahMax: 500,
    sedangMax: 2500,
    tinggiMax: 5000,
  });
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [tempThresholds, setTempThresholds] = useState({
    rendahMax: 500,
    sedangMax: 2500,
    tinggiMax: 5000,
  });

  // Search query state for KC or Region search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Default selected city is Jakarta (first entry in default cities)
  const [selectedCityId, setSelectedCityId] = useState<string | null>('1');

  // Island filter state
  const [selectedIsland, setSelectedIsland] = useState<string>('Semua');

  // Ranking metric state for Top 10 & Bottom 10
  const [rankingMetric, setRankingMetric] = useState<'total' | 'informasi' | 'permintaan' | 'pengaduan' | 'slaCompliance'>('total');

  // Aggregate and deduplicate KC data by unique Kantor Cabang name using SUM formula and accurate GPS coordinates
  const uniqueCities = useMemo(() => {
    if (!currentCities || currentCities.length === 0) return [];

    const map: Record<string, {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      informasi: number;
      permintaan: number;
      pengaduan: number;
      slaSum: number;
      count: number;
    }> = {};

    currentCities.forEach(c => {
      if (!c.name) return;
      const cleanKey = c.name.toLowerCase().trim();

      const infoVal = parseNumericValue(c.informasi);
      const permVal = parseNumericValue(c.permintaan);
      const pengVal = parseNumericValue(c.pengaduan);
      const slaVal = parseNumericValue(c.slaCompliance) || 90;

      // Always resolve accurate geographic coordinates for Indonesian cities & KC
      const resolved = findCityCoordinates(c.name);
      const lat = (resolved && resolved.lat !== 0) ? resolved.lat : (c.latitude || -6.2088);
      const lon = (resolved && resolved.lon !== 0) ? resolved.lon : (c.longitude || 106.8456);

      if (!map[cleanKey]) {
        map[cleanKey] = {
          id: c.id,
          name: c.name,
          latitude: lat,
          longitude: lon,
          informasi: 0,
          permintaan: 0,
          pengaduan: 0,
          slaSum: 0,
          count: 0,
        };
      }

      // Rumus SUM per kategori layanan
      map[cleanKey].informasi += infoVal;
      map[cleanKey].permintaan += permVal;
      map[cleanKey].pengaduan += pengVal;
      map[cleanKey].slaSum += slaVal;
      map[cleanKey].count += 1;
    });

    return Object.entries(map).map(([key, item], index) => {
      const total = item.informasi + item.permintaan + item.pengaduan;
      const avgSla = item.count > 0 ? Math.round(item.slaSum / item.count) : 90;
      const slaCompliance = Math.min(100, Math.max(0, avgSla));

      return {
        id: item.id || `kc_uniq_${index}_${key.replace(/[^a-z0-9]/gi, '_')}`,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        informasi: item.informasi,
        permintaan: item.permintaan,
        pengaduan: item.pengaduan,
        total,
        avgSlaDays: 2.4,
        slaCompliance,
      };
    });
  }, [currentCities]);

  // Compute Top 10 & Bottom 10 rankings
  const { top10, bottom10 } = useMemo(() => {
    if (!uniqueCities) return { top10: [], bottom10: [] };
    const sorted = [...uniqueCities].sort((a, b) => {
      const valA = parseNumericValue(a[rankingMetric]);
      const valB = parseNumericValue(b[rankingMetric]);
      return valB - valA;
    });
    const top = sorted.slice(0, 10);
    const bottom = [...sorted].reverse().slice(0, 10);
    return { top10: top, bottom10: bottom };
  }, [uniqueCities, rankingMetric]);

  // Filtered cities list based on search query and selected island (using unique KC list)
  const filteredCities = useMemo(() => {
    if (!uniqueCities) return [];
    const query = searchQuery.toLowerCase().trim();
    return uniqueCities.filter(c => {
      const island = getIslandForCity(c.name, c.latitude, c.longitude);
      const matchesIsland = selectedIsland === 'Semua' || island === selectedIsland;
      const matchesSearch = !query || 
        c.name.toLowerCase().includes(query) || 
        island.toLowerCase().includes(query);
      return matchesIsland && matchesSearch;
    });
  }, [uniqueCities, selectedIsland, searchQuery]);

  // Convert real lat/lon values to detailed 1000x400 map coordinate canvas
  const projectCoords = (lat: number, lon: number) => {
    const minLon = 95.0;
    const maxLon = 141.0;
    const minLat = -11.0;
    const maxLat = 6.0;

    const width = 1000;
    const height = 400;

    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;

    return { x, y };
  };

  const selectedCity = useMemo(() => {
    if (!uniqueCities || uniqueCities.length === 0) return null;
    return uniqueCities.find(c => c.id === selectedCityId) || uniqueCities[0];
  }, [uniqueCities, selectedCityId]);

  // Map style mode set strictly to topografi
  const [mapStyle, setMapStyle] = useState<'voyager' | 'satellite' | 'topo' | 'osm' | 'svg'>('topo');
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize and update Leaflet Map instance locked to Indonesia Topography
  useEffect(() => {
    if (mapStyle === 'svg' || !leafletContainerRef.current) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersGroupRef.current = null;
      }
      return;
    }

    if (!leafletMapRef.current) {
      // Indonesia Geographic Bounding Box
      const INDONESIA_BOUNDS = L.latLngBounds(
        L.latLng(-11.5, 94.0), // Southwest
        L.latLng(6.5, 141.5)   // Northeast
      );

      const map = L.map(leafletContainerRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        minZoom: 5,
        maxZoom: 12,
        maxBounds: INDONESIA_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      leafletMapRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = leafletMapRef.current;

    // Clear existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Topographic Esri Tile Map
    const tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, {
      maxZoom: 12,
      minZoom: 5,
      subdomains: 'abc',
    }).addTo(map);

    setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 150);

  }, [mapStyle]);

  // Get point color based on total reports volume and configurable thresholds
  const getPointColor = (total: number) => {
    if (total <= volumeThresholds.rendahMax) return '#818cf8'; // Soft Indigo (Rendah)
    if (total <= volumeThresholds.sedangMax) return '#14b8a6'; // Teal (Sedang)
    if (total <= volumeThresholds.tinggiMax) return '#f59e0b'; // Amber (Tinggi)
    return '#f43f5e'; // Rose Crimson (Sangat Tinggi)
  };

  // Render KC Markers on Leaflet map as simple small dots without inline text badges
  useEffect(() => {
    if (!leafletMapRef.current || !markersGroupRef.current || mapStyle === 'svg') return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const query = searchQuery.toLowerCase().trim();

    uniqueCities.forEach((city) => {
      const cityIsland = getIslandForCity(city.name, city.latitude, city.longitude);
      const matchesIsland = selectedIsland === 'Semua' || cityIsland === selectedIsland;
      const matchesSearch = !query || 
        city.name.toLowerCase().includes(query) || 
        cityIsland.toLowerCase().includes(query);

      const isSelected = city.id === selectedCityId;
      const dotColor = getPointColor(city.total);

      const opacity = (matchesIsland && matchesSearch) ? 1 : 0.15;
      const dotSize = isSelected ? 12 : (query && matchesSearch ? 11 : 9);

      const icon = L.divIcon({
        className: 'custom-kc-leaflet-marker',
        html: `
          <div style="opacity: ${opacity}; transition: all 0.2s;" class="relative flex items-center justify-center cursor-pointer">
            ${isSelected || (query && matchesSearch) ? `<div style="background-color: ${dotColor};" class="absolute -inset-2 rounded-full animate-ping opacity-75"></div>` : ''}
            <div style="width: ${dotSize}px; height: ${dotSize}px; background-color: ${dotColor};" 
                 class="relative rounded-full shadow-md border-2 border-white transform hover:scale-150 transition-all duration-200">
            </div>
          </div>
        `,
        iconSize: [dotSize, dotSize],
        iconAnchor: [dotSize / 2, dotSize / 2],
      });

      const marker = L.marker([city.latitude, city.longitude], { icon });

      // Clean Tooltip for Region Name (Keterangan nama daerah)
      marker.bindTooltip(`
        <div class="px-2 py-1 font-sans text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" style="background-color: ${dotColor}"></span>
          <span>KC ${city.name}</span>
          <span class="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono font-bold">${city.total}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -6],
        className: 'custom-leaflet-tooltip bg-white shadow-md border border-slate-200 rounded-lg p-0 overflow-hidden'
      });

      const popupContent = `
        <div class="p-1 min-w-[210px] font-sans">
          <div class="font-extrabold text-slate-800 text-xs flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
            <span class="text-sm">KC ${city.name}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full text-white font-bold" style="background-color: ${dotColor}">
              ${city.total} Laporan
            </span>
          </div>
          <div class="grid grid-cols-3 gap-1 text-center text-[11px] mb-2">
            <div class="bg-indigo-50 p-1 rounded border border-indigo-100"><div class="text-[9px] text-indigo-600 font-bold">Info</div><div class="font-extrabold text-slate-800">${city.informasi}</div></div>
            <div class="bg-teal-50 p-1 rounded border border-teal-100"><div class="text-[9px] text-teal-600 font-bold">Minta</div><div class="font-extrabold text-slate-800">${city.permintaan}</div></div>
            <div class="bg-rose-50 p-1 rounded border border-rose-100"><div class="text-[9px] text-rose-600 font-bold">Aduan</div><div class="font-extrabold text-slate-800">${city.pengaduan}</div></div>
          </div>
          <div class="text-[11px] text-slate-600 flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-200">
            <span>SLA Terpenuhi:</span>
            <span class="font-extrabold text-emerald-600 text-xs">${city.slaCompliance}%</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      marker.on('click', () => {
        setSelectedCityId(city.id);
      });

      markersGroup.addLayer(marker);
    });
  }, [uniqueCities, selectedCityId, selectedIsland, volumeThresholds, mapStyle, searchQuery]);

  // Smoothly Fly Map View when Island Filter Changes
  useEffect(() => {
    if (!leafletMapRef.current || mapStyle === 'svg') return;
    const map = leafletMapRef.current;

    const ISLAND_COORDS: Record<string, { center: [number, number]; zoom: number }> = {
      'Semua': { center: [-2.5489, 118.0149], zoom: 5 },
      'Sumatera': { center: [0.5897, 101.3431], zoom: 6 },
      'Jawa': { center: [-7.2504, 110.1403], zoom: 7 },
      'Kalimantan': { center: [-0.9328, 114.1208], zoom: 6 },
      'Sulawesi': { center: [-1.4300, 121.4456], zoom: 6 },
      'Bali & Nusa Tenggara': { center: [-8.6500, 117.5000], zoom: 7 },
      'Maluku & Papua': { center: [-3.5000, 134.0000], zoom: 6 },
    };

    const target = ISLAND_COORDS[selectedIsland] || ISLAND_COORDS['Semua'];
    map.flyTo(target.center, target.zoom, {
      duration: 1.2
    });
  }, [selectedIsland, mapStyle]);

  // Fly to selected city when selected from list
  useEffect(() => {
    if (!leafletMapRef.current || !selectedCityId || mapStyle === 'svg') return;
    const city = uniqueCities.find(c => c.id === selectedCityId);
    if (city) {
      leafletMapRef.current.flyTo([city.latitude, city.longitude], Math.max(leafletMapRef.current.getZoom(), 7), {
        duration: 0.8
      });
    }
  }, [selectedCityId, mapStyle, uniqueCities]);

  // Process rows into map points using current or updated config mappings
  const applyRowsWithConfig = (rows: any[], cfg: MapSyncConfig) => {
    if (!rows || rows.length === 0) return 0;

    const matchedKC = cfg.cityColumn;
    const matchedInfo = cfg.informasiColumn;
    const matchedPermintaan = cfg.permintaanColumn;
    const matchedPengaduan = cfg.pengaduanColumn;
    const matchedSla = cfg.slaColumn;

    // Grouping map to aggregate multiple rows for the same KC using SUM formula
    const kcMap: Record<string, {
      rawName: string;
      latitude: number;
      longitude: number;
      informasi: number;
      permintaan: number;
      pengaduan: number;
      slaSum: number;
      count: number;
    }> = {};

    rows.forEach((row, rowIdx) => {
      const rawName = String(row[matchedKC] || '').trim();
      if (!rawName) return;

      const foundCoords = findCityCoordinates(rawName);
      // Ensure coordinates are valid land coordinates in Indonesia (defaulting to Jakarta inland if unknown)
      const coords = foundCoords || { lat: -6.2088, lon: 106.8456 };

      const cleanKey = rawName.toLowerCase().trim();

      const infoVal = matchedInfo && row[matchedInfo] !== undefined ? parseNumericValue(row[matchedInfo]) : 0;
      const permVal = matchedPermintaan && row[matchedPermintaan] !== undefined ? parseNumericValue(row[matchedPermintaan]) : 0;
      const pengVal = matchedPengaduan && row[matchedPengaduan] !== undefined ? parseNumericValue(row[matchedPengaduan]) : 0;
      const slaVal = matchedSla && row[matchedSla] !== undefined ? parseNumericValue(row[matchedSla]) : 90;

      if (!kcMap[cleanKey]) {
        kcMap[cleanKey] = {
          rawName,
          latitude: coords.lat,
          longitude: coords.lon,
          informasi: 0,
          permintaan: 0,
          pengaduan: 0,
          slaSum: 0,
          count: 0,
        };
      }

      // Rumus SUM per kategori layanan per Kantor Cabang unik
      kcMap[cleanKey].informasi += infoVal;
      kcMap[cleanKey].permintaan += permVal;
      kcMap[cleanKey].pengaduan += pengVal;
      kcMap[cleanKey].slaSum += slaVal;
      kcMap[cleanKey].count += 1;
    });

    const syncedCities: CityData[] = Object.entries(kcMap).map(([key, item], index) => {
      // Total layanan per kategori menggunakan rumus SUM
      const total = item.informasi + item.permintaan + item.pengaduan;
      const avgSla = item.count > 0 ? Math.round(item.slaSum / item.count) : 90;
      const slaCompliance = Math.min(100, Math.max(0, avgSla));

      return {
        id: `kc_unique_${index}_${key}`,
        name: item.rawName,
        latitude: item.latitude,
        longitude: item.longitude,
        informasi: item.informasi,
        permintaan: item.permintaan,
        pengaduan: item.pengaduan,
        total,
        avgSlaDays: 2.4,
        slaCompliance,
      };
    });

    if (syncedCities.length > 0) {
      onCitiesDataChange(syncedCities);
      try {
        localStorage.setItem('indonesia_map_synced_default_cities', JSON.stringify(syncedCities));
        localStorage.setItem('indonesia_map_cities_data_v3', JSON.stringify(syncedCities));
      } catch (e) {
        console.error('Failed to save synced default cities', e);
      }
      setSyncConfig(prev => ({ ...prev, ...cfg, isSynced: true, lastSyncedAt: new Date().toLocaleTimeString() }));
      if (syncedCities[0]) {
        setSelectedCityId(syncedCities[0].id);
      }
    }

    return syncedCities.length;
  };

  // Handler when user manually selects or changes column/row mappings
  const handleColumnMappingChange = (fieldKey: keyof MapSyncConfig, selectedCol: string) => {
    const updatedConfig: MapSyncConfig = {
      ...syncConfig,
      [fieldKey]: selectedCol,
    };
    setSyncConfig(updatedConfig);

    if (sheetRawRows && sheetRawRows.length > 0) {
      applyRowsWithConfig(sheetRawRows, updatedConfig);
    }
  };

  // Automatically analyze columns and sync rows to map points
  const autoSyncRowsAndColumns = (rows: any[], columns: string[]) => {
    if (!rows || rows.length === 0 || !columns || columns.length === 0) return 0;

    // Detect columns automatically
    const matchedKC = columns.find(c => /kc|kantor.*cabang|cabang|kota|city|daerah|wilayah|lokasi|kabupaten|nama/i.test(c)) || columns[0] || '';
    const matchedInfo = columns.find(c => /info|layanan.*info|informasi/i.test(c)) || '';
    const matchedPermintaan = columns.find(c => /minta|layanan.*minta|permintaan|tindakan/i.test(c)) || '';
    const matchedPengaduan = columns.find(c => /aduan|layanan.*aduan|pengaduan|komplain/i.test(c)) || '';
    const matchedSla = columns.find(c => /sla|compliance|kepatuhan|persen|percent/i.test(c)) || '';

    const newCfg: MapSyncConfig = {
      ...syncConfig,
      cityColumn: matchedKC,
      informasiColumn: matchedInfo,
      permintaanColumn: matchedPermintaan,
      pengaduanColumn: matchedPengaduan,
      slaColumn: matchedSla,
    };

    setSyncConfig(newCfg);
    return applyRowsWithConfig(rows, newCfg);
  };

  // Load spreadsheet headers/columns and retrieve the sheet tabs list
  const handleFetchHeaders = async () => {
    if (!syncConfig.sheetUrl) {
      setErrorMsg('Masukkan URL Google Sheet terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (syncConfig.sheetUrl) {
        localStorage.setItem('google_sheet_sync_url', syncConfig.sheetUrl);
      }

      // 1. Fetch all sheet tabs from the Google Sheet through our backend proxy API
      const responseSheets = await fetch(`/api/get-sheets?url=${encodeURIComponent(syncConfig.sheetUrl)}`);
      let sheetsList: { id: string; name: string }[] = [];
      if (responseSheets.ok) {
        const json = await responseSheets.json();
        sheetsList = json.sheets || [];
      }
      
      if (sheetsList.length === 0) {
        sheetsList = [{ id: '0', name: 'Sheet1' }];
      }

      // Detect active gid if specified in pasted link, and add it if not already present
      const urlParsed = extractSpreadsheetId(syncConfig.sheetUrl);
      if (urlParsed.gid && !sheetsList.some((s: any) => String(s.id) === String(urlParsed.gid))) {
        sheetsList.unshift({ id: urlParsed.gid, name: `Tab (GID: ${urlParsed.gid})` });
      }

      setAvailableSheets(sheetsList);

      const initialGid = sheetsList.find((s: any) => String(s.id) === String(urlParsed.gid))?.id || sheetsList[0]?.id || '0';
      setSelectedSheetId(initialGid);

      // 2. Fetch headers and columns for this active sheet tab ID
      const { data, columns } = await fetchSheetData(syncConfig.sheetUrl, initialGid);
      setAvailableColumns(columns);
      setSheetRawRows(data);
      
      // Auto-analyze & sync directly to map
      const mappedCount = autoSyncRowsAndColumns(data, columns);
      const activeTabName = sheetsList.find((s: any) => s.id === initialGid)?.name || 'Sheet1';

      if (mappedCount > 0) {
        setSuccessMsg(`Berhasil! Tab "${activeTabName}" terbaca & dianalisis secara otomatis. ${mappedCount} lokasi Kantor Cabang langsung ditampilkan di peta.`);
      } else {
        setErrorMsg('Spreadsheet terbaca tetapi tidak ada nama Kota/KC yang sesuai dengan peta Indonesia.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca Google Sheet. Pastikan link diatur Publik (Anyone with link can view).');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse a specific sheet inside an uploaded Excel/CSV workbook (unrestricted rows & columns)
  const processExcelSheet = (wb: XLSX.WorkBook, sheetName: string, fileName?: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) {
      setErrorMsg(`Sheet "${sheetName}" tidak ditemukan dalam file.`);
      return;
    }
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
      defval: '',
      raw: false,
      blankrows: false,
    });
    if (!rawData || rawData.length === 0) {
      setErrorMsg(`Sheet "${sheetName}" kosong atau tidak memiliki baris data.`);
      setAvailableColumns([]);
      setSheetRawRows([]);
      return;
    }

    // Collect all column headers from every row to avoid missing sparse columns
    const colSet = new Set<string>();
    rawData.forEach(row => {
      Object.keys(row).forEach(k => colSet.add(k));
    });
    const columns = Array.from(colSet);

    setAvailableColumns(columns);
    setSheetRawRows(rawData);

    const mappedCount = autoSyncRowsAndColumns(rawData, columns);
    const activeFileName = fileName || uploadedFileName || 'File Upload';

    if (mappedCount > 0) {
      setSuccessMsg(`Berhasil memuat file "${activeFileName}"! Tab "${sheetName}" terdeteksi (${rawData.length} baris data). ${mappedCount} lokasi Kantor Cabang disinkronkan ke peta.`);
    } else {
      setErrorMsg(`Tab "${sheetName}" terdeteksi tetapi tidak ada nama Kota/KC yang sesuai dengan koordinat peta Indonesia.`);
    }
  };

  // Handler for file upload input (.xlsx, .xls, .csv)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setUploadedWorkbook(workbook);

        const sheetNames = workbook.SheetNames || [];
        if (sheetNames.length === 0) {
          setErrorMsg('File Excel/CSV tidak memiliki sheet atau tab yang valid.');
          setIsLoading(false);
          return;
        }

        const sheetsList = sheetNames.map(name => ({ id: name, name }));
        setAvailableSheets(sheetsList);

        const firstSheetName = sheetNames[0];
        setSelectedSheetId(firstSheetName);

        processExcelSheet(workbook, firstSheetName, file.name);
      } catch (err: any) {
        setErrorMsg('Gagal membaca file: ' + (err.message || 'Pastikan file berformat .xlsx, .xls, atau .csv.'));
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Terjadi kesalahan saat membaca file.');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Change selected tab and fetch its headers/data
  const handleSheetChange = async (sheetId: string) => {
    setSelectedSheetId(sheetId);
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (syncSourceMode === 'file' && uploadedWorkbook) {
      try {
        processExcelSheet(uploadedWorkbook, sheetId);
      } catch (err: any) {
        setErrorMsg(`Gagal memuat sheet: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const { data, columns } = await fetchSheetData(syncConfig.sheetUrl, sheetId);
      setAvailableColumns(columns);
      setSheetRawRows(data);
      
      const mappedCount = autoSyncRowsAndColumns(data, columns);
      const activeTabName = availableSheets.find(s => s.id === sheetId)?.name || 'Sheet1';

      if (mappedCount > 0) {
        setSuccessMsg(`Beralih ke tab "${activeTabName}". ${mappedCount} lokasi Kantor Cabang otomatis diperbarui di peta.`);
      } else {
        setErrorMsg(`Tab "${activeTabName}" tidak memiliki data Kantor Cabang yang valid.`);
      }
    } catch (err: any) {
      setErrorMsg(`Gagal memuat tab sheet: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual trigger if user wants to force re-sync
  const handleApplySync = () => {
    if (sheetRawRows.length === 0) {
      setErrorMsg('Data spreadsheet kosong atau belum dimuat.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const mappedCount = autoSyncRowsAndColumns(sheetRawRows, availableColumns);
      if (mappedCount === 0) {
        setErrorMsg('Tidak ditemukan nama kota / KC yang cocok dengan pendaftaran koordinat Indonesia.');
      } else {
        setSuccessMsg(`${mappedCount} data Kantor Cabang berhasil diperbarui pada peta!`);
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg(null);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg('Gagal memetakan data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample simulation spreadsheet CSV
  const handleLoadSampleCSV = () => {
    const rawData = parseSampleCSV(SAMPLE_SHEETS_CSV.map);
    setSheetRawRows(rawData);
    const columns = Object.keys(rawData[0]);
    setAvailableColumns(columns);
    setAvailableSheets([
      { id: '0', name: 'SLA_Monitoring_Utama' },
      { id: '1', name: 'Laporan_KC_Regional' }
    ]);
    setSelectedSheetId('0');
    
    setSyncConfig({
      sheetUrl: 'https://docs.google.com/spreadsheets/d/demo-indonesia/edit',
      cityColumn: 'KC',
      informasiColumn: 'Layanan Informasi',
      permintaanColumn: 'Permintaan Tindakan',
      pengaduanColumn: 'Pengaduan Layanan',
      slaColumn: 'Kepatuhan SLA',
      isSynced: true,
      lastSyncedAt: new Date().toLocaleTimeString()
    });

    const mappedCount = autoSyncRowsAndColumns(rawData, columns);
    setSuccessMsg(`Berhasil memuat data contoh! ${mappedCount} Kantor Cabang otomatis aktif di peta.`);
  };

  const parseSampleCSV = (csvText: string): any[] => {
    return parseCSV(csvText);
  };

  const handleResetToDefault = () => {
    try {
      const savedSynced = localStorage.getItem('indonesia_map_synced_default_cities');
      if (savedSynced) {
        const parsed = JSON.parse(savedSynced);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onCitiesDataChange(parsed);
          setSuccessMsg('Kembali ke data Google Sheet yang tersinkron.');
          setTimeout(() => setSuccessMsg(null), 2000);
          return;
        }
      }
    } catch (e) {}

    onCitiesDataChange(DEFAULT_CITIES);
    setSyncConfig({
      sheetUrl: '',
      sheetId: '',
      cityColumn: '',
      informasiColumn: '',
      permintaanColumn: '',
      pengaduanColumn: '',
      slaColumn: '',
      isSynced: false,
    });
    setSheetRawRows([]);
    setAvailableColumns([]);
    setSelectedCityId('1'); // Reset to Jakarta
    setSuccessMsg('Reset ke data default berhasil.');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  return (
    <div id="geographic-monitoring-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* MAP VIEWPORT: Full 12-columns */}
      <div className="col-span-12 lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-slate-800">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <MapPin className="text-rose-500 h-6 w-6 animate-pulse" />
                Peta Geografis Realistis Indonesia
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visualisasi pesisir laut dan kepulauan Indonesia dengan marker layanan dinamis berdasarkan total aduan Kantor Cabang (KC).
              </p>
            </div>
            
            {/* Action Group */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* MENU SEARCH KC / WILAYAH */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-3xs relative">
                <Search className="h-4 w-4 text-indigo-600 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari KC / Wilayah..."
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:font-normal placeholder:text-slate-400 shadow-3xs w-40 sm:w-48"
                  id="search-kc-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* FILTER PULAU BESAR INDONESIA */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-3xs">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap hidden sm:inline">Pulau:</span>
                <select
                  value={selectedIsland}
                  onChange={(e) => setSelectedIsland(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs"
                  id="select-island-filter"
                >
                  <option value="Semua">🌏 Semua Pulau (Indonesia)</option>
                  <option value="Sumatera">🏝️ Pulau Sumatera</option>
                  <option value="Jawa">🏝️ Pulau Jawa & Madura</option>
                  <option value="Kalimantan">🏝️ Pulau Kalimantan</option>
                  <option value="Sulawesi">🏝️ Pulau Sulawesi</option>
                  <option value="Bali & Nusa Tenggara">🏝️ Bali & Nusa Tenggara</option>
                  <option value="Maluku & Papua">🏝️ Kep. Maluku & Papua</option>
                </select>
                {(selectedIsland !== 'Semua' || searchQuery) && (
                  <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-md shrink-0">
                    {filteredCities.length} KC
                  </span>
                )}
              </div>

              {isAdmin ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  id="open-sync-modal-btn"
                  title="Sinkronisasi Google Spreadsheet (Admin)"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Sync Sheet / Excel</span>
                </button>
              ) : (
                <button
                  onClick={onRequestAdminLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                  id="open-sync-modal-btn"
                  title="Login Admin untuk Sinkronisasi Data"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  <span>Sync (Admin)</span>
                </button>
              )}

              {syncConfig.isSynced && isAdmin && (
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  id="reset-map-default-btn"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* COMPACT & RINGKAS COLOR LEGEND BASED ON CONFIGURABLE SERVICE TOTAL */}
          <div className="flex items-center justify-between gap-3 bg-slate-50/90 px-4 py-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 mb-4 shadow-3xs flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="text-slate-600 font-extrabold uppercase tracking-wider text-[11px] shrink-0">Indikator Volume:</span>
              
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#818cf8' }}></span>
                <span className="font-bold text-xs text-slate-800">&lt; {volumeThresholds.rendahMax} <span className="text-slate-500 font-normal">(Rendah)</span></span>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#14b8a6' }}></span>
                <span className="font-bold text-xs text-slate-800">{volumeThresholds.rendahMax + 1} - {volumeThresholds.sedangMax} <span className="text-slate-500 font-normal">(Sedang)</span></span>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#f59e0b' }}></span>
                <span className="font-bold text-xs text-slate-800">{volumeThresholds.sedangMax + 1} - {volumeThresholds.tinggiMax} <span className="text-slate-500 font-normal">(Tinggi)</span></span>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-3xs">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#f43f5e' }}></span>
                <span className="font-bold text-xs text-slate-800">&gt; {volumeThresholds.tinggiMax} <span className="text-slate-500 font-normal">(Sangat Tinggi)</span></span>
              </div>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setTempThresholds(volumeThresholds);
                  setIsIndicatorModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer shrink-0 ml-auto shadow-3xs"
                id="edit-volume-indicator-btn"
                title="Edit Nilai Indikator Volume (Admin)"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Edit Indikator</span>
              </button>
            ) : null}
          </div>

          {/* MAP MODE TABS / LAYER SELECTOR (Hidden as requested) */}
          <div className="hidden items-center justify-between gap-2 mb-3 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                Mode Peta:
              </span>

              <button
                type="button"
                onClick={() => setMapStyle('topo')}
                className="px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs border border-emerald-700 ring-1 ring-emerald-500/30"
                title="Tampilan Medan & Topografi Pegunungan Indonesia (Terkunci NKRI)"
              >
                <span>🏔️ Peta Topografi Indonesia</span>
                <span className="bg-emerald-800/60 text-emerald-100 text-[9px] px-1.5 py-0.2 rounded uppercase tracking-wider font-extrabold">NKRI Locked</span>
              </button>

              <button
                type="button"
                onClick={() => setMapStyle('voyager')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  mapStyle === 'voyager'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Peta Jalan Realistis"
              >
                <span>🗺️ Realistis</span>
              </button>

              <button
                type="button"
                onClick={() => setMapStyle('satellite')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                  mapStyle === 'satellite'
                    ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Satelit Asli"
              >
                <span>🛰️ Satelit</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (leafletMapRef.current) {
                  leafletMapRef.current.flyTo([-2.5489, 118.0149], 5, { duration: 1 });
                }
              }}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Reset Posisi Peta Indonesia"
            >
              <Compass className="h-3.5 w-3.5 text-emerald-600" />
              <span>Reset Wilayah Indonesia</span>
            </button>
          </div>

          {/* INTERACTIVE MAP CONTAINER */}
          {mapStyle !== 'svg' ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
              <div ref={leafletContainerRef} className="w-full h-[400px] bg-slate-100 z-10" />

              {/* FLOATING LEGEND BADGE OVER MAP */}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md z-20 pointer-events-none flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-extrabold text-slate-800">
                  {mapStyle === 'satellite' ? 'Peta Satelit Aktif' : mapStyle === 'topo' ? 'Peta Topografi Aktif' : mapStyle === 'osm' ? 'OpenStreetMap Aktif' : 'Peta Realistis Indonesia'}
                </span>
              </div>
            </div>
          ) : (
            /* SVG Map Canvas (Realistis Indonesia Coastlines) */
            <div className="relative bg-gradient-to-b from-sky-50/60 to-blue-50/40 rounded-2xl border border-slate-200 overflow-hidden min-h-[380px] flex items-center justify-center p-4 group shadow-inner">
              
              {/* Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

              {/* Sea depth soft contours */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[85%] h-[75%] rounded-full border border-sky-200/40 opacity-60"></div>
                <div className="absolute w-[60%] h-[50%] rounded-full border border-sky-300/30 opacity-40"></div>
              </div>

              <svg viewBox="0 0 1000 400" className="w-full h-auto max-w-full relative z-10 filter drop-shadow-sm">
                {/* REALISTIC AND HIGHLY DETAILED ISLAND COASTLINES */}
                <g strokeWidth="1" strokeLinejoin="round">
                  {/* Sumatra */}
                  <path
                    d="M 6.3 11.5 C 5.5 13.0, 10.0 23.0, 15.0 32.0 C 22.0 45.0, 31.0 60.0, 48.0 85.0 C 65.0 110.0, 80.0 130.0, 105.0 165.0 C 130.0 200.0, 150.0 230.0, 175.0 265.0 C 195.0 290.0, 210.0 310.0, 222.0 328.0 C 226.0 334.0, 230.0 334.0, 234.0 331.0 C 238.0 328.0, 240.0 320.0, 238.0 310.0 C 235.0 295.0, 222.0 280.0, 215.0 270.0 C 210.0 262.0, 218.0 260.0, 222.0 262.0 C 230.0 265.0, 240.0 272.0, 248.0 274.0 C 255.0 275.0, 252.0 265.0, 246.0 258.0 C 235.0 245.0, 210.0 220.0, 195.0 205.0 C 182.0 192.0, 178.0 180.0, 175.0 165.0 C 172.0 150.0, 178.0 145.0, 170.0 130.0 C 164.0 118.0, 150.0 105.0, 140.0 92.0 C 130.0 78.0, 122.0 72.0, 115.0 65.0 C 105.0 55.0, 95.0 45.0, 85.0 38.0 C 72.0 28.0, 50.0 18.0, 38.0 13.0 C 28.0 9.0, 12.0 8.0, 6.3 11.5 Z"
                    fill={selectedIsland === 'Sumatera' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Sumatera' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Sumatera' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Sumatera')}
                  />
                  
                  {/* Java & Madura */}
                  <path
                    d="M 226.0 286.0 C 228.0 282.0, 235.0 282.0, 242.0 284.0 C 255.0 288.0, 268.0 286.0, 280.0 288.0 C 295.0 290.0, 310.0 292.0, 325.0 294.0 C 345.0 296.0, 365.0 298.0, 385.0 300.0 C 405.0 302.0, 415.0 305.0, 425.0 308.0 C 430.0 310.0, 432.0 315.0, 428.0 318.0 C 422.0 322.0, 415.0 324.0, 410.0 324.0 C 395.0 324.0, 380.0 320.0, 365.0 318.0 C 345.0 315.0, 325.0 312.0, 305.0 310.0 C 285.0 308.0, 265.0 304.0, 245.0 300.0 C 235.0 298.0, 224.0 294.0, 226.0 286.0 Z"
                    fill={selectedIsland === 'Jawa' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Jawa' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Jawa' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Jawa')}
                  />

                  {/* Madura */}
                  <path
                    d="M 405.0 298.0 C 412.0 296.0, 422.0 298.0, 425.0 301.0 C 420.0 304.0, 410.0 305.0, 405.0 298.0 Z"
                    fill={selectedIsland === 'Jawa' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Jawa' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Jawa' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Jawa')}
                  />

                  {/* Kalimantan */}
                  <path
                    d="M 295.0 125.0 C 305.0 110.0, 320.0 100.0, 340.0 95.0 C 360.0 90.0, 385.0 92.0, 405.0 98.0 C 420.0 102.0, 435.0 100.0, 450.0 108.0 C 465.0 115.0, 475.0 130.0, 480.0 145.0 C 485.0 160.0, 475.0 175.0, 482.0 190.0 C 488.0 202.0, 495.0 215.0, 490.0 225.0 C 485.0 235.0, 470.0 240.0, 460.0 242.0 C 445.0 245.0, 435.0 252.0, 420.0 250.0 C 410.0 248.0, 405.0 240.0, 395.0 238.0 C 385.0 236.0, 375.0 242.0, 365.0 245.0 C 352.0 248.0, 340.0 242.0, 332.0 232.0 C 325.0 222.0, 328.0 210.0, 322.0 200.0 C 315.0 190.0, 305.0 185.0, 298.0 175.0 C 290.0 162.0, 282.0 142.0, 295.0 125.0 Z"
                    fill={selectedIsland === 'Kalimantan' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Kalimantan' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Kalimantan' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Kalimantan')}
                  />

                  {/* Sulawesi */}
                  <path
                    d="M 512.0 145.0 C 522.0 142.0, 535.0 140.0, 545.0 142.0 C 555.0 144.0, 565.0 140.0, 575.0 143.0 C 585.0 146.0, 595.0 150.0, 608.0 152.0 C 625.0 155.0, 638.0 158.0, 642.0 162.0 C 640.0 166.0, 628.0 166.0, 618.0 167.0 C 598.0 169.0, 580.0 165.0, 565.0 175.0 C 558.0 180.0, 562.0 188.0, 568.0 194.0 C 575.0 202.0, 585.0 210.0, 595.0 218.0 C 598.0 222.0, 595.0 225.0, 590.0 224.0 C 580.0 222.0, 570.0 215.0, 560.0 210.0 C 552.0 206.0, 548.0 212.0, 546.0 218.0 C 542.0 230.0, 540.0 242.0, 542.0 254.0 C 543.0 258.0, 540.0 262.0, 536.0 260.0 C 530.0 256.0, 532.0 245.0, 532.0 235.0 C 532.0 222.0, 528.0 212.0, 520.0 202.0 C 515.0 195.0, 510.0 205.0, 508.0 212.0 C 504.0 225.0, 498.0 238.0, 495.0 250.0 C 493.0 255.0, 488.0 256.0, 486.0 250.0 C 484.0 240.0, 492.0 225.0, 495.0 215.0 C 498.0 202.0, 498.0 190.0, 500.0 178.0 C 502.0 165.0, 495.0 158.0, 502.0 152.0 C 506.0 148.0, 508.0 148.0, 512.0 145.0 Z"
                    fill={selectedIsland === 'Sulawesi' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Sulawesi' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Sulawesi' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Sulawesi')}
                  />

                  {/* Bali & Nusa Tenggara Chain */}
                  <g
                    fill={selectedIsland === 'Bali & Nusa Tenggara' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Bali & Nusa Tenggara' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Bali & Nusa Tenggara' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Bali & Nusa Tenggara')}
                  >
                    {/* Bali */}
                    <path d="M 432.0 324.0 C 435.0 322.0, 442.0 323.0, 444.0 326.0 C 441.0 328.0, 435.0 328.0, 432.0 324.0 Z" />
                    {/* Lombok */}
                    <path d="M 448.0 326.0 C 451.0 324.0, 455.0 325.0, 456.0 328.0 C 453.0 330.0, 449.0 329.0, 448.0 326.0 Z" />
                    {/* Sumbawa */}
                    <path d="M 460.0 326.0 C 465.0 324.0, 475.0 325.0, 478.0 329.0 C 472.0 332.0, 465.0 330.0, 460.0 326.0 Z" />
                    {/* Flores */}
                    <path d="M 484.0 328.0 C 495.0 325.0, 510.0 326.0, 518.0 330.0 C 510.0 334.0, 495.0 333.0, 484.0 328.0 Z" />
                    {/* Sumba */}
                    <path d="M 490.0 340.0 C 498.0 338.0, 505.0 340.0, 508.0 344.0 C 502.0 346.0, 494.0 344.0, 490.0 340.0 Z" />
                    {/* Timor */}
                    <path d="M 524.0 342.0 C 532.0 336.0, 545.0 334.0, 552.0 338.0 C 548.0 344.0, 535.0 348.0, 524.0 342.0 Z" />
                  </g>

                  {/* Maluku */}
                  <g
                    fill={selectedIsland === 'Maluku & Papua' ? '#a7f3d0' : '#cbd5e1'}
                    stroke={selectedIsland === 'Maluku & Papua' ? '#059669' : '#94a3b8'}
                    strokeWidth={selectedIsland === 'Maluku & Papua' ? 2 : 1}
                    className="transition-all duration-300 hover:fill-emerald-200 cursor-pointer"
                    onClick={() => setSelectedIsland('Maluku & Papua')}
                  >
                    {/* Halmahera */}
                    <path d="M 645.0 105.0 C 652.0 102.0, 662.0 104.0, 668.0 100.0 C 672.0 104.0, 665.0 110.0, 662.0 115.0 C 665.0 118.0, 672.0 120.0, 678.0 118.0 C 675.0 122.0, 665.0 124.0, 658.0 126.0 C 655.0 130.0, 656.0 135.0, 658.0 140.0 C 654.0 138.0, 652.0 130.0, 650.0 124.0 C 645.0 120.0, 645.0 115.0, 645.0 105.0 Z" />
                    {/* Seram */}
                    <path d="M 650.0 178.0 C 665.0 175.0, 680.0 176.0, 690.0 180.0 C 680.0 184.0, 665.0 183.0, 650.0 178.0 Z" />
                    {/* Buru */}
                    <path d="M 632.0 176.0 C 638.0 174.0, 645.0 175.0, 647.0 179.0 C 642.0 182.0, 635.0 181.0, 632.0 176.0 Z" />

                    {/* Papua */}
                    <path
                      d="M 755.0 152.0 C 765.0 145.0, 778.0 144.0, 788.0 148.0 C 795.0 152.0, 792.0 160.0, 798.0 164.0 C 805.0 168.0, 820.0 165.0, 835.0 168.0 C 855.0 172.0, 875.0 170.0, 895.0 173.0 C 915.0 176.0, 945.0 174.0, 965.0 178.0 C 985.0 182.0, 1005.0 180.0, 1018.0 184.0 C 1020.0 190.0, 1015.0 210.0, 1012.0 235.0 C 1016.0 250.0, 1012.0 265.0, 995.0 262.0 C 975.0 255.0, 955.0 250.0, 935.0 244.0 C 915.0 240.0, 895.0 235.0, 875.0 230.0 C 860.0 225.0, 845.0 224.0, 830.0 218.0 C 815.0 210.0, 805.0 205.0, 802.0 198.0 C 808.0 195.0, 805.0 192.0, 795.0 192.0 C 785.0 186.0, 775.0 176.0, 765.0 168.0 C 760.0 162.0, 762.0 158.0, 755.0 152.0 Z"
                    />
                  </g>
                </g>

                {/* Grid coordinates indicator */}
                <text x="15" y="390" fill="#94a3b8" fontSize="10" className="select-none font-mono font-bold">95°BT</text>
                <text x="955" y="390" fill="#94a3b8" fontSize="10" className="select-none font-mono font-bold">141°BT</text>
                <text x="960" y="25" fill="#94a3b8" fontSize="10" className="select-none font-mono font-bold">6°LU</text>
                <text x="960" y="365" fill="#94a3b8" fontSize="10" className="select-none font-mono font-bold">11°LS</text>

                {/* MAPPED MARKERS */}
                {currentCities.map((city) => {
                  const { x, y } = projectCoords(city.latitude, city.longitude);
                  const isSelected = city.id === selectedCityId;
                  const dotColor = getPointColor(city.total);
                  
                  const cityIsland = getIslandForCity(city.name, city.latitude, city.longitude);
                  const isMatchingIsland = selectedIsland === 'Semua' || cityIsland === selectedIsland;

                  if (!isMatchingIsland && selectedIsland !== 'Semua') {
                    return (
                      <g key={city.id} className="cursor-pointer opacity-20 hover:opacity-70 transition-opacity" onClick={() => setSelectedCityId(city.id)}>
                        <circle cx={x} cy={y} r={4} fill="#94a3b8" />
                      </g>
                    );
                  }

                  const radius = Math.min(22, Math.max(7, Math.sqrt(city.total) * 0.95));

                  return (
                    <g key={city.id} className="cursor-pointer" onClick={() => setSelectedCityId(city.id)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={radius + (isSelected ? 7 : 4)}
                        fill={dotColor}
                        fillOpacity={isSelected ? 0.45 : 0.2}
                        stroke={dotColor}
                        strokeWidth={isSelected ? 2.5 : 0}
                        className={isSelected ? 'animate-ping origin-center' : ''}
                      />
                      
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={dotColor}
                        fillOpacity={isSelected ? 1.0 : 0.85}
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="transition-all duration-200 hover:scale-120 hover:stroke-indigo-50"
                      />

                      <circle
                        cx={x}
                        cy={y}
                        r={3}
                        fill="#ffffff"
                        fillOpacity={0.9}
                      />

                      {(isSelected || city.total > 150 || selectedIsland !== 'Semua') && (
                        <g className="pointer-events-none select-none">
                          <rect
                            x={x - city.name.length * 3.5 - 8}
                            y={y - radius - 21}
                            width={city.name.length * 7 + 16}
                            height={16}
                            rx={6}
                            fill="#1e293b"
                            fillOpacity={0.95}
                            stroke="#e2e8f0"
                            strokeWidth={1}
                          />
                          <text
                            x={x}
                            y={y - radius - 9}
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="font-sans font-bold"
                          >
                            {city.name}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Quick Helper Floating Overlay */}
              <div className="absolute bottom-3 left-3 bg-white/95 border border-slate-200/80 p-2.5 rounded-xl text-[10px] text-slate-500 shadow-md backdrop-blur pointer-events-none flex flex-col gap-0.5 z-25 max-w-xs font-medium">
                <span className="font-bold text-slate-800">Panduan Interaksi Peta:</span>
                <span>• Klik lingkaran daerah untuk melihat detail KC di kanan.</span>
                <span>• Gradasi warna pin mewakili jumlah volume laporan.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED SERVICE REPORT PER KC: Full 12-columns below map */}
      <div className="col-span-12 lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-slate-800">
        <div>
          <div className="border-b border-slate-100 pb-3.5 mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-indigo-600 block font-black uppercase tracking-wider">Detail Informasi Wilayah</span>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mt-0.5">
                <MapPin className="h-5 w-5 text-rose-500 shrink-0" />
                KC {selectedCity ? selectedCity.name : 'Belum Memilih'}
              </h3>
            </div>

            {selectedCity && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                  Wilayah: <strong className="text-slate-800">{getIslandForCity(selectedCity.name, selectedCity.latitude, selectedCity.longitude)}</strong>
                </span>
                <span className="text-xs font-extrabold text-white bg-indigo-600 px-3 py-1 rounded-xl shadow-2xs">
                  Total {selectedCity.total} Tiket
                </span>
              </div>
            )}
          </div>

          {selectedCity ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* LAYANAN INFORMASI STAT */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100/90 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-indigo-700 flex items-center gap-1.5">
                      <Info className="h-4 w-4" />
                      Layanan Informasi
                    </span>
                    <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono">
                      {selectedCity.total > 0 ? Math.round((selectedCity.informasi / selectedCity.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono mb-2">
                    {selectedCity.informasi} <span className="text-xs text-slate-500 font-normal font-sans">tiket</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${selectedCity.total > 0 ? (selectedCity.informasi / selectedCity.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* PERMINTAAN TINDAKAN STAT */}
              <div className="p-4 bg-teal-50/60 border border-teal-100/90 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-teal-700 flex items-center gap-1.5">
                      <ArrowUpRight className="h-4 w-4" />
                      Permintaan Tindakan
                    </span>
                    <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-mono">
                      {selectedCity.total > 0 ? Math.round((selectedCity.permintaan / selectedCity.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono mb-2">
                    {selectedCity.permintaan} <span className="text-xs text-slate-500 font-normal font-sans">tiket</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-teal-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${selectedCity.total > 0 ? (selectedCity.permintaan / selectedCity.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* PENGADUAN LAYANAN STAT */}
              <div className="p-4 bg-amber-50/60 border border-amber-100/90 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-amber-700 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4" />
                      Pengaduan Layanan
                    </span>
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
                      {selectedCity.total > 0 ? Math.round((selectedCity.pengaduan / selectedCity.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono mb-2">
                    {selectedCity.pengaduan} <span className="text-xs text-slate-500 font-normal font-sans">tiket</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedCity.total > 0 ? (selectedCity.pengaduan / selectedCity.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* AGGREGATES & KEPATUHAN SLA BAR */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                      Kepatuhan SLA
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedCity.slaCompliance >= 90 ? 'bg-emerald-100 text-emerald-800' :
                      selectedCity.slaCompliance >= 85 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedCity.slaCompliance >= 90 ? 'Sangat Baik' : selectedCity.slaCompliance >= 85 ? 'Baik' : 'Perlu Perhatian'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-2xl font-black font-mono ${
                      selectedCity.slaCompliance >= 90 ? 'text-emerald-600' :
                      selectedCity.slaCompliance >= 85 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {selectedCity.slaCompliance}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Target &ge; 85%</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 mt-2 flex items-center justify-between">
                  <span>Respons Tepat Waktu</span>
                  <span className="font-bold text-slate-800">{selectedCity.total} Tiket Handled</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Info className="h-8 w-8 mx-auto mb-2 text-slate-300 animate-pulse" />
              <p className="text-xs font-bold">Silakan pilih titik kota pada peta untuk memunculkan detail laporan.</p>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-3 flex items-center gap-2 justify-between text-[10px] text-slate-400 font-medium">
          <span>Sistem Pemetaan Kantor Cabang & Stat Laporan</span>
          <span className="text-indigo-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Live Data Active
          </span>
        </div>
      </div>

      {/* TOP 10 & BOTTOM 10 LAYANAN / KANTOR CABANG SECTION */}
      <div className="col-span-12 lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="text-amber-500 h-5 w-5" />
              Peringkat 10 Top & 10 Bottom Layanan / Kantor Cabang
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Analisis komparatif unit layanan terbaik dan unit yang memerlukan perhatian khusus di peta.</p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Kriteria:</span>
            <button
              onClick={() => setRankingMetric('total')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${rankingMetric === 'total' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Total Laporan
            </button>
            <button
              onClick={() => setRankingMetric('slaCompliance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${rankingMetric === 'slaCompliance' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Kepatuhan SLA
            </button>
            <button
              onClick={() => setRankingMetric('informasi')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${rankingMetric === 'informasi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Informasi
            </button>
            <button
              onClick={() => setRankingMetric('permintaan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${rankingMetric === 'permintaan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Permintaan
            </button>
            <button
              onClick={() => setRankingMetric('pengaduan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${rankingMetric === 'pengaduan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Pengaduan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* TOP 10 LAYANAN / CABANG */}
          <div className="bg-emerald-50/20 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <Trophy className="h-4.5 w-4.5 text-emerald-600" />
                  10 Top Layanan & Kantor Cabang Terbaik
                </h4>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">Tertinggi</span>
              </div>

              <div className="space-y-2.5">
                {top10.map((item, index) => {
                  const val = parseNumericValue(item[rankingMetric]);
                  return (
                    <div 
                      key={`top-${item.id}`} 
                      onClick={() => setSelectedCityId(item.id)}
                      className={`bg-white border p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer ${selectedCityId === item.id ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30' : 'border-emerald-100 hover:border-emerald-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-[11px] ${
                          index === 0 ? 'bg-amber-400 text-white shadow-xs' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">SLA: {item.slaCompliance}% | Rata-rata: {item.avgSlaDays} hari</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          {val} {rankingMetric === 'slaCompliance' ? '%' : 'laporan'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTTOM 10 LAYANAN / CABANG */}
          <div className="bg-rose-50/20 border border-rose-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                  <TrendingDown className="h-4.5 w-4.5 text-rose-600" />
                  10 Bottom Layanan & Kantor Cabang (Perlu Perhatian)
                </h4>
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg">Terendah</span>
              </div>

              <div className="space-y-2.5">
                {bottom10.map((item, index) => {
                  const val = parseNumericValue(item[rankingMetric]);
                  return (
                    <div 
                      key={`bottom-${item.id}`} 
                      onClick={() => setSelectedCityId(item.id)}
                      className={`bg-white border p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer ${selectedCityId === item.id ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/30' : 'border-rose-100 hover:border-rose-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-[11px] bg-rose-100 text-rose-700">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-800 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">SLA: {item.slaCompliance}% | Rata-rata: {item.avgSlaDays} hari</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-rose-700 text-sm">
                          {val} {rankingMetric === 'slaCompliance' ? '%' : 'laporan'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SINKRONISASI GOOGLE SHEET MODAL DIALOG POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fadeIn p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600 h-5 w-5" />
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                  Sync Google Sheet Peta
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Sync Source Mode Selector Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSyncSourceMode('url');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    syncSourceMode === 'url'
                      ? 'bg-white text-emerald-700 shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  id="modal-mode-url-btn"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Link Google Sheets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSyncSourceMode('file');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    syncSourceMode === 'file'
                      ? 'bg-white text-emerald-700 shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  id="modal-mode-file-btn"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload Excel / CSV
                </button>
              </div>

              {syncSourceMode === 'url' ? (
                <>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex gap-2 items-start text-xs text-slate-500">
                    <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700 block">Panduan Berbagi & Format Google Sheet:</span>
                      <span className="block mt-0.5 text-[11px] leading-relaxed">
                        1. Pastikan Sheet Anda diatur ke <strong className="text-slate-800">"Anyone with the link can view"</strong> (Siapa saja dapat melihat).
                        <br/>2. Harus memiliki satu kolom berisi nama kota/KC Indonesia (contoh kolom: <strong className="text-slate-800">KC</strong>, <strong className="text-slate-800">Kota</strong>, atau <strong className="text-slate-800">Cabang</strong>).
                      </span>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-650">Link Google Sheets / Spreadsheet</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tempel link Google Sheet publik..."
                        value={syncConfig.sheetUrl}
                        onChange={(e) => setSyncConfig(prev => ({ ...prev, sheetUrl: e.target.value }))}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 min-w-0 font-medium"
                        id="modal-sheet-url-input"
                      />
                      <button
                        type="button"
                        onClick={handleFetchHeaders}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-3xs shrink-0"
                        id="modal-fetch-headers-btn"
                      >
                        {isLoading ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : 'Muat'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* FILE UPLOAD MODE */
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Pilih / Unggah File Excel (.xlsx, .xls) atau CSV</label>
                  <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl p-5 transition-all text-center flex flex-col items-center justify-center gap-2 relative group cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      id="modal-file-upload-input"
                    />
                    <div className="p-3 bg-white rounded-full shadow-2xs border border-emerald-100 group-hover:scale-110 transition-transform">
                      <FileUp className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {uploadedFileName ? (
                          <span className="text-emerald-700 font-extrabold flex items-center justify-center gap-1.5">
                            <FileSpreadsheet className="h-4 w-4 shrink-0" />
                            {uploadedFileName}
                          </span>
                        ) : (
                          'Klik atau seret file Excel / CSV ke sini'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung format .xlsx, .xls, dan .csv
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pilih Sheet / Tab Dropdown Selection */}
              {availableSheets.length > 0 && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Pilih Sheet / Tab <span className="text-emerald-600 font-normal">({availableSheets.length} tab terdeteksi)</span>
                  </label>
                  <select
                    value={selectedSheetId}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    id="modal-select-sheet-tab"
                  >
                    {availableSheets.map(sheet => (
                      <option key={sheet.id} value={sheet.id}>
                        📄 {sheet.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status / Errors */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex gap-1.5 items-start">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex gap-1.5 items-start animate-fadeIn">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* EDITABLE COLUMN & ROW MAPPING CONFIGURATION */}
              {availableColumns.length > 0 ? (
                <div className="space-y-4 bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                      <SlidersHorizontal className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Penetapan Acuan Kolom & Baris Data Excel:</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      {availableColumns.length} Kolom Terdeteksi
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Pilih kolom acuan dari file Excel / Google Sheet Anda di bawah ini. Pilihan Anda akan menjadi <strong className="text-emerald-900 font-bold">dasar acuan utama perhitungan jumlah layanan</strong> dan visualisasi peta.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* 1. KC / City Column */}
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <label className="block text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                        <span>1. Kolom KC / Kota / Cabang</span>
                        <span className="text-[9px] text-emerald-600 font-semibold">(Wajib)</span>
                      </label>
                      <select
                        value={syncConfig.cityColumn}
                        onChange={(e) => handleColumnMappingChange('cityColumn', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        id="modal-select-city-col"
                      >
                        <option value="">-- Pilih Kolom Nama KC / Kota --</option>
                        {availableColumns.map(col => (
                          <option key={`city_${col}`} value={col}>📌 {col}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Layanan Informasi */}
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>2. Kolom Layanan Informasi</span>
                        <span className="text-[9px] text-blue-600 font-semibold">(Hitung Layanan)</span>
                      </label>
                      <select
                        value={syncConfig.informasiColumn}
                        onChange={(e) => handleColumnMappingChange('informasiColumn', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        id="modal-select-info-col"
                      >
                        <option value="">-- Tanpa Layanan Informasi (0) --</option>
                        {availableColumns.map(col => (
                          <option key={`info_${col}`} value={col}>ℹ️ {col}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Permintaan Tindakan */}
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>3. Kolom Permintaan Tindakan</span>
                        <span className="text-[9px] text-amber-600 font-semibold">(Hitung Layanan)</span>
                      </label>
                      <select
                        value={syncConfig.permintaanColumn}
                        onChange={(e) => handleColumnMappingChange('permintaanColumn', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        id="modal-select-minta-col"
                      >
                        <option value="">-- Tanpa Permintaan Tindakan (0) --</option>
                        {availableColumns.map(col => (
                          <option key={`minta_${col}`} value={col}>📝 {col}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Pengaduan Layanan */}
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>4. Kolom Pengaduan Layanan</span>
                        <span className="text-[9px] text-rose-600 font-semibold">(Hitung Layanan)</span>
                      </label>
                      <select
                        value={syncConfig.pengaduanColumn}
                        onChange={(e) => handleColumnMappingChange('pengaduanColumn', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        id="modal-select-aduan-col"
                      >
                        <option value="">-- Tanpa Pengaduan Layanan (0) --</option>
                        {availableColumns.map(col => (
                          <option key={`aduan_${col}`} value={col}>⚠️ {col}</option>
                        ))}
                      </select>
                    </div>

                    {/* 5. SLA Column */}
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>5. Kolom Kepatuhan SLA (%)</span>
                        <span className="text-[9px] text-emerald-700 font-semibold">(Persentase SLA)</span>
                      </label>
                      <select
                        value={syncConfig.slaColumn}
                        onChange={(e) => handleColumnMappingChange('slaColumn', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        id="modal-select-sla-col"
                      >
                        <option value="">-- Default SLA (90%) --</option>
                        {availableColumns.map(col => (
                          <option key={`sla_${col}`} value={col}>📊 {col}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* LIVE CALCULATION SUMMARY ACCORDING TO CHOSEN COLUMNS */}
                  <div className="bg-emerald-900 text-white p-3.5 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-emerald-700/60 pb-1.5">
                      <span className="flex items-center gap-1.5 text-emerald-200">
                        <Database className="h-4 w-4 text-emerald-400" />
                        Hasil Perhitungan Berdasarkan Acuan Terpilih:
                      </span>
                      <span className="text-amber-300 bg-emerald-800 px-2 py-0.5 rounded text-[10px]">
                        {currentCities.length} KC Terpetakan
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div className="bg-emerald-800/80 p-2 rounded-lg border border-emerald-700/50">
                        <span className="text-[10px] text-emerald-300 block font-bold">Total Layanan</span>
                        <span className="text-sm font-extrabold text-white">
                          {currentCities.reduce((acc, c) => acc + c.total, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-emerald-800/80 p-2 rounded-lg border border-emerald-700/50">
                        <span className="text-[10px] text-emerald-300 block font-bold">Rata-rata SLA</span>
                        <span className="text-sm font-extrabold text-emerald-300">
                          {(currentCities.reduce((acc, c) => acc + c.slaCompliance, 0) / (currentCities.length || 1)).toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-emerald-800/80 p-2 rounded-lg border border-emerald-700/50">
                        <span className="text-[10px] text-emerald-300 block font-bold">Informasi + Minta + Aduan</span>
                        <span className="text-[11px] font-bold text-amber-200 block truncate">
                          {currentCities.reduce((acc, c) => acc + c.informasi, 0)} + {currentCities.reduce((acc, c) => acc + c.permintaan, 0)} + {currentCities.reduce((acc, c) => acc + c.pengaduan, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleCSV}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                    id="modal-load-sample-btn"
                  >
                    <Database className="h-4 w-4" />
                    Gunakan Data Contoh Peta Indonesia
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer with Simpan & Terapkan Button */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-slate-500 transition-colors cursor-pointer"
              >
                Batal
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (sheetRawRows && sheetRawRows.length > 0) {
                    const count = applyRowsWithConfig(sheetRawRows, syncConfig);
                    if (count > 0) {
                      setSuccessMsg(`Berhasil menyimpan! ${count} data Kantor Cabang dari file/sheet telah diterapkan ke peta.`);
                      setTimeout(() => {
                        setIsModalOpen(false);
                        setSuccessMsg(null);
                      }, 500);
                    } else {
                      setErrorMsg('Data tidak dapat ditampilkan ke peta. Pastikan kolom Nama KC / Kota sudah dipilih dengan benar dan sesuai dengan nama lokasi daerah di Indonesia.');
                    }
                  } else {
                    setIsModalOpen(false);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                id="modal-submit-sync-btn"
              >
                <Save className="h-4 w-4" />
                <span>Simpan & Tampilkan Data</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DIALOG EDIT INDIKATOR VOLUME */}
      {isIndicatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fadeIn p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 className="text-indigo-600 h-4.5 w-4.5" />
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                  Edit Batas Indikator Volume
                </h3>
              </div>
              <button
                onClick={() => setIsIndicatorModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Inputs */}
            <div className="p-4 space-y-3.5 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Atur nilai acuan batas jumlah laporan untuk penentuan gradasi warna titik daerah pada peta Indonesia:
              </p>

              {/* 1. Rendah */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 text-[11px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                    1. Kategori Rendah (&lt; X)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Default: 500</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-slate-600">Batas Max Rendah:</span>
                  <input
                    type="number"
                    value={tempThresholds.rendahMax}
                    onChange={(e) => setTempThresholds(prev => ({ ...prev, rendahMax: Number(e.target.value) || 0 }))}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 text-right"
                    min={1}
                    id="input-rendah-max"
                  />
                </div>
              </div>

              {/* 2. Sedang */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-700 text-[11px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    2. Kategori Sedang ({tempThresholds.rendahMax + 1} - Y)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Default: 2500</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-slate-600">Batas Max Sedang:</span>
                  <input
                    type="number"
                    value={tempThresholds.sedangMax}
                    onChange={(e) => setTempThresholds(prev => ({ ...prev, sedangMax: Number(e.target.value) || 0 }))}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-teal-500 text-right"
                    min={tempThresholds.rendahMax + 1}
                    id="input-sedang-max"
                  />
                </div>
              </div>

              {/* 3. Tinggi */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 text-[11px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    3. Kategori Tinggi ({tempThresholds.sedangMax + 1} - Z)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Default: 5000</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] text-slate-600">Batas Max Tinggi:</span>
                  <input
                    type="number"
                    value={tempThresholds.tinggiMax}
                    onChange={(e) => setTempThresholds(prev => ({ ...prev, tinggiMax: Number(e.target.value) || 0 }))}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-amber-500 text-right"
                    min={tempThresholds.sedangMax + 1}
                    id="input-tinggi-max"
                  />
                </div>
              </div>

              {/* 4. Sangat Tinggi info */}
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-[11px] text-rose-800 flex items-center gap-2 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>4. Kategori Sangat Tinggi: &gt; {tempThresholds.tinggiMax} Laporan</span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempThresholds({ rendahMax: 500, sedangMax: 2500, tinggiMax: 5000 });
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                id="reset-indicator-default-btn"
              >
                Reset Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsIndicatorModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVolumeThresholds(tempThresholds);
                    setIsIndicatorModalOpen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  id="save-volume-indicator-btn"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
