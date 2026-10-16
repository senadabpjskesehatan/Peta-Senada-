import React, { useState, useMemo } from 'react';
import {
  LogIn,
  LayoutDashboard,
  Award,
  TrendingUp,
  Building2,
  Users,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  Flame,
  CheckCircle2,
  ChevronRight,
  MapPin,
  ExternalLink,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { UnitUtilizationSummary, UserActivityLog, AppUser } from '../types';
import { SYSTEM_MENUS, MENU_NAME_MAP } from '../data/defaultActivityData';

interface UserUtilizationAnalyticsProps {
  summaries: UnitUtilizationSummary[];
  logs: UserActivityLog[];
  currentUser: AppUser | null;
  onRefresh?: () => void;
  onNavigateMenu?: (menuId: string) => void;
}

export const UserUtilizationAnalytics: React.FC<UserUtilizationAnalyticsProps> = ({
  summaries,
  logs,
  currentUser,
  onRefresh,
  onNavigateMenu,
}) => {

  // Sort metric for leaderboard: 'total' | 'login' | 'menu'
  const [sortByMetric, setSortByMetric] = useState<'total' | 'login' | 'menu'>('total');
  // Filter for detailed table
  const [tableRoleFilter, setTableRoleFilter] = useState<'all' | 'kepwil' | 'kantor_cabang' | 'kantor_pusat'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Active view tab in bottom section: 'table' vs 'logs'
  const [bottomTab, setBottomTab] = useState<'table' | 'logs'>('table');

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalLogins = 0;
    let totalMenuUsages = 0;
    let kepwilLogins = 0;
    let kepwilMenuUsages = 0;
    let kcLogins = 0;
    let kcMenuUsages = 0;

    const menuAggregates: Record<string, number> = {};

    summaries.forEach((s) => {
      totalLogins += s.loginCount;
      totalMenuUsages += s.menuUsageCount;

      if (s.role === 'kepwil') {
        kepwilLogins += s.loginCount;
        kepwilMenuUsages += s.menuUsageCount;
      } else if (s.role === 'kantor_cabang') {
        kcLogins += s.loginCount;
        kcMenuUsages += s.menuUsageCount;
      }

      if (s.menuBreakdown) {
        Object.entries(s.menuBreakdown).forEach(([menuId, count]) => {
          menuAggregates[menuId] = (menuAggregates[menuId] || 0) + Number(count || 0);
        });
      }
    });

    const totalInteractions = totalLogins + totalMenuUsages;
    const avgMenuPerLogin = totalLogins > 0 ? (totalMenuUsages / totalLogins).toFixed(1) : '0';

    return {
      totalLogins,
      totalMenuUsages,
      totalInteractions,
      kepwilLogins,
      kepwilMenuUsages,
      kcLogins,
      kcMenuUsages,
      avgMenuPerLogin,
      menuAggregates,
    };
  }, [summaries]);

  // TOP 5 Leaderboard based on metric (excluding Kantor Pusat as per requirement)
  const top5List = useMemo(() => {
    const list = summaries.filter((s) => s.role !== 'kantor_pusat');

    list.sort((a, b) => {
      if (sortByMetric === 'login') return b.loginCount - a.loginCount;
      if (sortByMetric === 'menu') return b.menuUsageCount - a.menuUsageCount;
      return b.totalPemanfaatan - a.totalPemanfaatan;
    });

    return list.slice(0, 5);
  }, [summaries, sortByMetric]);

  const maxLeaderboardScore = useMemo(() => {
    if (top5List.length === 0) return 1;
    if (sortByMetric === 'login') return Math.max(...top5List.map((s) => s.loginCount), 1);
    if (sortByMetric === 'menu') return Math.max(...top5List.map((s) => s.menuUsageCount), 1);
    return Math.max(...top5List.map((s) => s.totalPemanfaatan), 1);
  }, [top5List, sortByMetric]);

  // Filtered detailed table
  const filteredTableList = useMemo(() => {
    return summaries
      .filter((s) => {
        if (tableRoleFilter !== 'all' && s.role !== tableRoleFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.officeName.toLowerCase().includes(q) ||
            s.username.toLowerCase().includes(q) ||
            s.displayName.toLowerCase().includes(q) ||
            (s.parentKepwil && s.parentKepwil.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => b.totalPemanfaatan - a.totalPemanfaatan);
  }, [summaries, tableRoleFilter, searchQuery]);

  // Find most used menu for an individual unit
  const getTopMenuForUnit = (breakdown: Record<string, number> | undefined) => {
    if (!breakdown || Object.keys(breakdown).length === 0) return 'Peta Layanan';
    const sorted = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
    return sorted[0] ? (MENU_NAME_MAP[sorted[0][0]] || sorted[0][0]) : 'Peta Layanan';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="user-utilization-section">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-12 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide uppercase">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Sistem Analisis Pemanfaatan & Aktivitas Pengguna
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pemanfaatan Aplikasi Kedeputian Wilayah & Kantor Cabang
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              Monitoring real-time aktivitas login dan intensitas pemanfaatan seluruh menu layanan SENADA oleh unit kerja Kedeputian Wilayah dan Kantor Cabang di seluruh Indonesia.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                title="Perbarui data pemanfaatan secara live"
              >
                <RefreshCw className="w-4 h-4 text-indigo-300" />
                <span>Sinkronisasi Data</span>
              </button>
            )}
            <div className="bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-2 rounded-xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-300">Live Tracker Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. JUMLAH LOGIN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shadow-3xs">
              <LogIn className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              Indikator Utama
            </span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Jumlah Login
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {metrics.totalLogins.toLocaleString('id-ID')}
              </h3>
              <span className="text-xs font-bold text-slate-500">Sesi Login</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
              <span>Kepwil: <strong className="text-slate-900">{metrics.kepwilLogins}</strong></span>
              <span>KC: <strong className="text-slate-900">{metrics.kcLogins}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. JUMLAH PEMANFAATAN MENU */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shadow-3xs">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Interaksi Fitur
            </span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Pemanfaatan Menu
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {metrics.totalMenuUsages.toLocaleString('id-ID')}
              </h3>
              <span className="text-xs font-bold text-slate-500">Kali Akses</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
              <span>Kepwil: <strong className="text-slate-900">{metrics.kepwilMenuUsages}</strong></span>
              <span>KC: <strong className="text-slate-900">{metrics.kcMenuUsages}</strong></span>
            </div>
          </div>
        </div>

        {/* 3. TOTAL AKTIVITAS PEMANFAATAN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shadow-3xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              Skor Total
            </span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              Total Pemanfaatan Sistem
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {metrics.totalInteractions.toLocaleString('id-ID')}
              </h3>
              <span className="text-xs font-bold text-slate-500">Aktivitas</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
              <span>Rerata Menu/Login:</span>
              <strong className="text-indigo-700 font-bold">{metrics.avgMenuPerLogin}x per sesi</strong>
            </div>
          </div>
        </div>

        {/* 4. UNIT AKTIF */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shadow-3xs">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              Cakupan Unit
            </span>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
              Unit Kerja Terpantau
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {summaries.length}
              </h3>
              <span className="text-xs font-bold text-slate-500">Unit Wilayah/KC</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
              <span>14 Kedeputian Wilayah</span>
              <span>127+ Kantor Cabang</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 5 PEMANFAATAN SECTION (MAIN USER REQUEST) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-700 rounded-xl shadow-3xs">
                <Award className="w-5 h-5 text-amber-600" />
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                5 Top Pemanfaatan Unit Kerja
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Peringkat 5 teratas berdasarkan intensitas login dan pemanfaatan menu layanan SENADA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">


            {/* SORTING METRIC SELECTOR */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600">
              <span className="text-[11px] uppercase font-bold text-slate-400">Urutkan:</span>
              <select
                value={sortByMetric}
                onChange={(e) => setSortByMetric(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="total">Total Pemanfaatan</option>
                <option value="login">Jumlah Login Terbanyak</option>
                <option value="menu">Pemanfaatan Menu Terbanyak</option>
              </select>
            </div>
          </div>
        </div>

        {/* TOP 5 CARDS LIST */}
        <div className="mt-6 space-y-3.5">
          {top5List.map((unit, index) => {
            const rank = index + 1;
            const rankBadgeColor =
              rank === 1
                ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-200 ring-4 ring-amber-100'
                : rank === 2
                ? 'bg-slate-300 text-slate-800 shadow-sm ring-4 ring-slate-100'
                : rank === 3
                ? 'bg-amber-700 text-white shadow-sm ring-4 ring-amber-50'
                : 'bg-slate-100 text-slate-700 border border-slate-200';

            const rankMedalIcon =
              rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            const relativeScore =
              sortByMetric === 'login'
                ? unit.loginCount
                : sortByMetric === 'menu'
                ? unit.menuUsageCount
                : unit.totalPemanfaatan;

            const percentOfMax = Math.round((relativeScore / maxLeaderboardScore) * 100);
            const topMenuName = getTopMenuForUnit(unit.menuBreakdown);

            return (
              <div
                key={unit.unitId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  rank === 1
                    ? 'bg-gradient-to-r from-amber-50/60 via-white to-white border-amber-300 shadow-sm'
                    : rank === 2
                    ? 'bg-gradient-to-r from-slate-50/70 via-white to-white border-slate-200/90'
                    : rank === 3
                    ? 'bg-gradient-to-r from-orange-50/40 via-white to-white border-orange-200/80'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* RANK AND IDENTITY */}
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 ${rankBadgeColor}`}
                  >
                    {rankMedalIcon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">
                        {unit.officeName}
                      </h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          unit.role === 'kepwil'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {unit.role === 'kepwil' ? 'Kepwil' : 'KC'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Kode: {unit.username}
                      </span>
                    </div>

                    {unit.parentKepwil && (
                      <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                        Wilayah: {unit.parentKepwil}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-medium">
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        Menu Terfavorit: <strong className="text-indigo-950 font-bold">{topMenuName}</strong>
                      </span>
                      <span className="hidden sm:inline-block text-slate-300">•</span>
                      <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        Terakhir aktif: {new Date(unit.lastActiveAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SCORES & INDICATORS */}
                <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Login Indicator */}
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Jumlah Login
                    </span>
                    <span className="text-base sm:text-lg font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 inline-block mt-0.5 tabular-nums">
                      {unit.loginCount}x
                    </span>
                  </div>

                  {/* Menu Usage Indicator */}
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Pemanfaatan Menu
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 inline-block mt-0.5 tabular-nums">
                      {unit.menuUsageCount}x
                    </span>
                  </div>

                  {/* Total Score */}
                  <div className="text-right min-w-[90px]">
                    <span className="text-[10px] uppercase font-extrabold text-indigo-600 block">
                      Total Skor
                    </span>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                        {unit.totalPemanfaatan.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">pts</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MENU UTILIZATION BREAKDOWN GRID */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Pemanfaatan Berdasarkan Setiap Menu Layanan
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Distribusi intensitas penggunaan fitur dashboard oleh pengguna Kedeputian Wilayah dan Kantor Cabang.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {SYSTEM_MENUS.map((menu) => {
            const count = metrics.menuAggregates[menu.id] || 0;
            const percentage =
              metrics.totalMenuUsages > 0
                ? Math.round((count / metrics.totalMenuUsages) * 100)
                : 0;

            return (
              <div
                key={menu.id}
                className="p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-sm transition-all bg-slate-50/50 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                      {menu.category}
                    </span>
                    <span className="text-xs font-black text-slate-900 tabular-nums">
                      {percentage}%
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm mt-2 block truncate">
                    {menu.name}
                  </h4>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-indigo-950 tabular-nums">
                      {count.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-bold text-slate-500">kali diakses</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, percentage))}%` }}
                  ></div>
                </div>

                {onNavigateMenu && (
                  <button
                    type="button"
                    onClick={() => onNavigateMenu(menu.id)}
                    className="mt-3.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group-hover:translate-x-0.5"
                  >
                    <span>Buka Menu Ini</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED DATA & REALTIME STREAM TABS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBottomTab('table')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                bottomTab === 'table'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Seluruh Unit ({filteredTableList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                bottomTab === 'logs'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Log Aktivitas Realtime ({logs.length})</span>
            </button>
          </div>

          {bottomTab === 'table' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Role filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTableRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    tableRoleFilter === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTableRoleFilter('kepwil')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    tableRoleFilter === 'kepwil' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-500'
                  }`}
                >
                  Kepwil
                </button>
                <button
                  type="button"
                  onClick={() => setTableRoleFilter('kantor_cabang')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    tableRoleFilter === 'kantor_cabang' ? 'bg-blue-600 text-white shadow-3xs' : 'text-slate-500'
                  }`}
                >
                  Kantor Cabang
                </button>
                <button
                  type="button"
                  onClick={() => setTableRoleFilter('kantor_pusat')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    tableRoleFilter === 'kantor_pusat' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500'
                  }`}
                >
                  Kantor Pusat
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari unit atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
                />
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: FULL TABLE */}
        {bottomTab === 'table' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-4 rounded-l-xl">Peringkat</th>
                  <th className="py-3 px-4">Nama Unit Kerja / Kantor</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4 text-center">Jumlah Login</th>
                  <th className="py-3 px-4 text-center">Pemanfaatan Menu</th>
                  <th className="py-3 px-4 text-right">Total Skor</th>
                  <th className="py-3 px-4 rounded-r-xl">Aktivitas Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTableList.slice(0, 30).map((row, idx) => (
                  <tr key={row.unitId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 tabular-nums">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{row.officeName}</div>
                      <div className="text-[11px] text-slate-400">Kode: {row.username} {row.parentKepwil ? `• ${row.parentKepwil}` : ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          row.role === 'kepwil'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.role === 'kantor_pusat'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {row.role === 'kepwil' ? 'Kepwil' : row.role === 'kantor_pusat' ? 'Kantor Pusat' : 'Kantor Cabang'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-700 tabular-nums">
                      <span className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                        {row.loginCount}x
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700 tabular-nums">
                      <span className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                        {row.menuUsageCount}x
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 tabular-nums">
                      {row.totalPemanfaatan.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 tabular-nums">
                      {new Date(row.lastActiveAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: LIVE ACTIVITY LOGS */}
        {bottomTab === 'logs' && (
          <div className="mt-4 space-y-2.5">
            {logs.map((log) => {
              const isLogin = log.type === 'login';
              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLogin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isLogin ? <LogIn className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{log.officeName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            log.role === 'kepwil' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {log.role === 'kepwil' ? 'Kepwil' : 'KC'}
                        </span>
                        <span className="text-slate-400 font-semibold text-[11px]">({log.username})</span>
                      </div>
                      <p className="text-slate-600 font-medium truncate mt-0.5">{log.details}</p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-semibold tabular-nums shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserUtilizationAnalytics;
