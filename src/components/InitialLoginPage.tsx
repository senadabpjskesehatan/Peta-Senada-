import React, { useState, useMemo } from 'react';
import {
  Lock,
  User,
  Key,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  FileText,
  ShieldAlert,
  Hash,
  Sparkles
} from 'lucide-react';
import { CityData, AppUser } from '../types';
import { parseNumericValue } from '../utils/sheetParser';
import { aggregateByKategoriAndPokok } from '../data/topikMasalahReference';
import { SenadaLogo } from './SenadaLogo';
import { DEFAULT_USERS } from '../lib/firebase';
import { getUtilizationSummaries, getRecentActivityLogs } from '../lib/activityTracker';

interface InitialLoginPageProps {
  citiesData: CityData[];
  users: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
}

export default function InitialLoginPage({ citiesData, users, onLoginSuccess }: InitialLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('Semua');
  const logs = useMemo(() => getRecentActivityLogs(), []);

  const monthMap: Record<string, number> = {
    'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
    'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
  };

  const loginTop5List = useMemo(() => {
    const summaries = getUtilizationSummaries().filter(s => s.role !== 'kantor_pusat');
    if (selectedMonthFilter === 'Semua') {
      const sorted = [...summaries].sort((a, b) => b.totalPemanfaatan - a.totalPemanfaatan);
      return sorted.slice(0, 5);
    } else {
      const targetMonthIndex = monthMap[selectedMonthFilter];
      const countsMap = new Map<string, { logins: number; menus: number; unit: any }>();
      
      summaries.forEach(s => {
        countsMap.set(s.unitId, { logins: 0, menus: 0, unit: s });
      });

      logs.forEach(l => {
        const d = new Date(l.timestamp);
        if (d.getMonth() === targetMonthIndex) {
          let entry = countsMap.get(l.userId);
          if (!entry) {
            const foundSummary = getUtilizationSummaries().find(s => (s.username === l.username || s.unitId === l.userId) && s.role !== 'kantor_pusat');
            if (foundSummary) {
              entry = { logins: 0, menus: 0, unit: foundSummary };
              countsMap.set(foundSummary.unitId, entry);
            }
          }
          if (entry) {
            if (l.type === 'login') entry.logins += 1;
            else if (l.type === 'menu_usage') entry.menus += 1;
          }
        }
      });

      const computed = Array.from(countsMap.values())
        .filter(e => e.unit.role !== 'kantor_pusat')
        .map(e => ({
          ...e.unit,
          loginCount: e.logins,
          menuUsageCount: e.menus,
          totalPemanfaatan: e.logins + e.menus,
        }));

      computed.sort((a, b) => b.totalPemanfaatan - a.totalPemanfaatan);
      return computed.slice(0, 5);
    }
  }, [selectedMonthFilter, logs]);

  // Full summary of topics directly aggregated from citiesData for exact metrics
  const fullSummary = useMemo(() => {
    return aggregateByKategoriAndPokok(citiesData, parseNumericValue);
  }, [citiesData]);

  // Summary Metrics for the 4 overview cards
  const summaryMetrics = useMemo(() => {
    const totalInformasi = fullSummary.byKategori.Informasi || 0;
    const totalPermintaan = fullSummary.byKategori.Permintaan || 0;
    const totalPengaduan = fullSummary.byKategori.Pengaduan || 0;
    const totalTiket = fullSummary.totalAll;

    const pctInformasi = totalTiket > 0 ? ((totalInformasi / totalTiket) * 100).toFixed(1) : '0';
    const pctPermintaan = totalTiket > 0 ? ((totalPermintaan / totalTiket) * 100).toFixed(1) : '0';
    const pctPengaduan = totalTiket > 0 ? ((totalPengaduan / totalTiket) * 100).toFixed(1) : '0';

    return {
      totalTiket,
      totalInformasi,
      pctInformasi,
      totalPermintaan,
      pctPermintaan,
      totalPengaduan,
      pctPengaduan,
    };
  }, [fullSummary]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      // 1. Check in registered users list (support code e.g. "101" or full name e.g. "KC BANDA ACEH")
      const userList = (users && users.length > 0) ? users : DEFAULT_USERS;
      const matchedUser = userList.find(
        u => u.username.toLowerCase() === cleanUser || (u.displayName && u.displayName.toLowerCase() === cleanUser)
      );

      if (matchedUser) {
        if (matchedUser.password !== cleanPass) {
          setIsLoading(false);
          setError('Nama Pengguna atau Kata Sandi salah. Silakan periksa kembali kredensial Anda.');
          return;
        }

        if (matchedUser.status === 'nonaktif') {
          setIsLoading(false);
          setError('Akun Anda saat ini berstatus Nonaktif. Silakan hubungi Administrator untuk aktivasi.');
          return;
        }

        setIsLoading(false);
        onLoginSuccess(matchedUser);
        return;
      }

      // 2. Default Administrator credentials fallback: user "senada", password "150bisa"
      if (cleanUser === 'senada' && cleanPass === '150bisa') {
        setIsLoading(false);
        onLoginSuccess({
          id: 'user_admin_senada',
          username: 'senada',
          role: 'admin',
          status: 'aktif',
          password: '150bisa'
        });
        return;
      }

      // 3. Fallback for test demo users if not yet synced in users list
      if (cleanUser === 'user' && cleanPass === 'user123') {
        setIsLoading(false);
        onLoginSuccess({
          id: 'user_staff_demo',
          username: 'user',
          displayName: 'KC JAKARTA PUSAT',
          role: 'kantor_cabang',
          status: 'aktif',
          password: 'user123'
        });
        return;
      }
      if (cleanUser === 'admin' && cleanPass === 'admin123') {
        setIsLoading(false);
        onLoginSuccess({
          id: 'user_admin_demo',
          username: 'admin',
          role: 'admin',
          status: 'aktif',
          password: 'admin123'
        });
        return;
      }

      setIsLoading(false);
      setError('Nama Pengguna atau Kata Sandi salah. Silakan periksa kembali kredensial Anda.');
    }, 350);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SenadaLogo size="md" theme="dark" showSubtitle={true} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Aktif & Terpantau
            </span>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">BPJS Kesehatan</span>
              <span className="text-xs text-slate-200 font-bold block">Sentra Informasi & Pengaduan</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 2xl:p-10 flex flex-col justify-center space-y-8">
        
        {/* Welcome Banner */}
        <div className="w-full text-center space-y-3 sm:space-y-4 pt-2 pb-4 px-2">
          {/* Judul Utama: PETA SENADA dengan peta Indonesia realistis di dalam tulisan */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl 2xl:text-9xl font-black tracking-[0.14em] sm:tracking-[0.18em] uppercase text-transparent bg-clip-text select-none drop-shadow-[0_4px_30px_rgba(6,182,212,0.45)] transition-all duration-300"
            style={{
              backgroundImage: "url('/src/assets/images/indonesia_map_1791868801989.jpg')",
              backgroundSize: '100% 100%',
              backgroundPosition: 'center 40%',
              backgroundRepeat: 'no-repeat',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'contrast(1.35) brightness(1.15) saturate(1.25)',
              WebkitTextStroke: '1px rgba(56, 189, 248, 0.4)',
            }}
          >
            PETA SENADA
          </h1>

          {/* Sub Judul: Pemanfaatan Data Senada dengan pembentang garis horizontal memanfaatkan lebar layar */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full max-w-4xl lg:max-w-5xl 2xl:max-w-6xl mx-auto">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-cyan-400/80 rounded-full hidden sm:block" />
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-wide uppercase whitespace-nowrap">
              Pemanfaatan Data Senada
            </h2>
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-cyan-500/40 to-cyan-400/80 rounded-full hidden sm:block" />
          </div>

          {/* Deskripsi: Dashboard pemanfaatan layanan... */}
          <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-slate-300/90 w-full max-w-full mx-auto px-2 sm:px-4 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
            Dashboard pemanfaatan layanan informasi, pengaduan, dan permintaan administrasi yang dikelola melalui Senada
          </p>
        </div>

        {/* 4 Key Summary Metrics (Jumlah Total Tiket, Layanan Informasi, Layanan Permintaan, Layanan Pengaduan) */}
        <section aria-label="Ringkasan Jumlah Tiket dan Layanan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Tiket */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all duration-200 relative overflow-hidden group hover:border-blue-500/50 hover:bg-slate-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Jumlah Total Tiket</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Hash className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1">
              {summaryMetrics.totalTiket.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
              <span>Total Volume Masuk</span>
              <span className="font-bold text-blue-400 flex items-center gap-1">
                100% Total
              </span>
            </div>
          </div>

          {/* 2. Layanan Informasi */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all duration-200 relative overflow-hidden group hover:border-sky-500/50 hover:bg-slate-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-bl-full pointer-events-none group-hover:bg-sky-500/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Layanan Informasi</span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-sky-300 tracking-tight mb-1">
              {summaryMetrics.totalInformasi.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
              <span>Pemberian Informasi</span>
              <span className="font-bold text-sky-300 flex items-center gap-1">
                {summaryMetrics.pctInformasi}% dari total
              </span>
            </div>
          </div>

          {/* 3. Layanan Permintaan */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all duration-200 relative overflow-hidden group hover:border-emerald-500/50 hover:bg-slate-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Layanan Permintaan</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-300 tracking-tight mb-1">
              {summaryMetrics.totalPermintaan.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
              <span>Permintaan Administrasi</span>
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                {summaryMetrics.pctPermintaan}% dari total
              </span>
            </div>
          </div>

          {/* 4. Layanan Pengaduan */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all duration-200 relative overflow-hidden group hover:border-rose-500/50 hover:bg-slate-800">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none group-hover:bg-rose-500/20 transition-all"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Layanan Pengaduan</span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-300 tracking-tight mb-1">
              {summaryMetrics.totalPengaduan.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
              <span>Pengaduan & Komplain</span>
              <span className="font-bold text-rose-300 flex items-center gap-1">
                {summaryMetrics.pctPengaduan}% dari total
              </span>
            </div>
          </div>

        </section>

        {/* Main Grid Container: Top Pemanfaatan di sebelah kiri, Menu Login di sebelah kanan */}
        <div className="max-w-7xl 2xl:max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TOP 5 PEMANFAATAN SECTION (DI SEBELAH KIRI) */}
          <section className="lg:col-span-7 bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Top 5 Pemanfaatan Pengguna</h3>
                  <p className="text-xs text-slate-400">Intensitas login dan pemanfaatan menu layanan tertinggi</p>
                </div>
              </div>

              {/* Month Filter Dropdown */}
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                <span className="font-bold text-slate-400">Periode:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="Semua" className="bg-slate-900 text-white">Semua (Akumulasi)</option>
                  <option value="Januari" className="bg-slate-900 text-white">Januari</option>
                  <option value="Februari" className="bg-slate-900 text-white">Februari</option>
                  <option value="Maret" className="bg-slate-900 text-white">Maret</option>
                  <option value="April" className="bg-slate-900 text-white">April</option>
                  <option value="Mei" className="bg-slate-900 text-white">Mei</option>
                  <option value="Juni" className="bg-slate-900 text-white">Juni</option>
                  <option value="Juli" className="bg-slate-900 text-white">Juli</option>
                  <option value="Agustus" className="bg-slate-900 text-white">Agustus</option>
                  <option value="September" className="bg-slate-900 text-white">September</option>
                  <option value="Oktober" className="bg-slate-900 text-white">Oktober</option>
                  <option value="November" className="bg-slate-900 text-white">November</option>
                  <option value="Desember" className="bg-slate-900 text-white">Desember</option>
                </select>
              </div>
            </div>

            {/* List Top 5 Unified */}
            <div className="space-y-2.5">
              {loginTop5List.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada aktivitas login atau pemanfaatan menu pada periode ini. Data akan tercatat otomatis saat user melakukan login & hit menu.
                </div>
              ) : (
                loginTop5List.map((unit, idx) => {
                  const rank = idx + 1;
                  const medalColor = rank === 1 ? 'bg-amber-400 text-amber-950 font-black' : rank === 2 ? 'bg-slate-300 text-slate-900 font-bold' : rank === 3 ? 'bg-amber-700 text-white font-bold' : 'bg-slate-700 text-slate-200';
                  return (
                    <div key={unit.unitId} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${medalColor}`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white truncate" title={unit.officeName}>{unit.officeName}</p>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              unit.role === 'kepwil' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
                            }`}>
                              {unit.role === 'kepwil' ? 'Kepwil' : 'KC'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Kode: {unit.username}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-amber-400">{unit.totalPemanfaatan} Total</div>
                        <div className="text-[10px] text-slate-400">Login: {unit.loginCount} | Menu: {unit.menuUsageCount}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* LOGIN FORM CARD (DI SEBELAH KANAN) */}
          <section className="lg:col-span-5 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Header Login */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Login Aplikasi SENADA</h2>
                </div>
              </div>
            </div>

            {/* Login Form Body */}
            <form onSubmit={handleLogin} className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="login-username">
                    Nama Pengguna (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan nama pengguna..."
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="login-password">
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  id="initial-login-submit-btn"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Dashboard Keseluruhan'}</span>
                </button>
              </div>

            </form>

          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 BPJS Kesehatan - Sentra Informasi dan Pengaduan (SENADA)</span>
        </div>
      </footer>
    </div>
  );
}
