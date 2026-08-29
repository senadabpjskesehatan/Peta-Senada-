import React, { useState, useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Filter, Search, PlusCircle, ArrowUpRight, HelpCircle, Activity } from 'lucide-react';
import { Ticket, LayananType, TicketStatus, SlaStatus } from '../types';

interface SlaTrackerProps {
  tickets: Ticket[];
  onTicketsChange: (tickets: Ticket[]) => void;
  availableCities: string[];
}

export default function SlaTracker({ tickets, onTicketsChange, availableCities }: SlaTrackerProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<string>('ALL');

  // New ticket state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    type: 'Informasi' as LayananType,
    city: 'Jakarta',
    slaDays: 3,
  });

  // Calculate stats based on current tickets
  const stats = useMemo(() => {
    const total = tickets.length;
    if (total === 0) return { compliance: 100, onTime: 0, warning: 0, overdue: 0, avgElapsed: 0 };

    const onTime = tickets.filter(t => t.slaStatus === 'On Time').length;
    const warning = tickets.filter(t => t.slaStatus === 'Warning').length;
    const overdue = tickets.filter(t => t.slaStatus === 'Overdue').length;
    
    const compliance = Math.round((onTime / total) * 100);
    const sumElapsed = tickets.reduce((acc, t) => acc + t.elapsedDays, 0);
    const avgElapsed = Number((sumElapsed / total).toFixed(1));

    return { compliance, onTime, warning, overdue, avgElapsed };
  }, [tickets]);

  // Handle tindaklanjut (follow up / status change)
  const handleFollowUp = (ticketId: string) => {
    const updated = tickets.map(ticket => {
      if (ticket.id !== ticketId) return ticket;

      let nextStatus: TicketStatus = 'Sedang Diproses';
      if (ticket.status === 'Sedang Diproses') {
        nextStatus = 'Selesai';
      } else if (ticket.status === 'Selesai') {
        // Toggle back or do nothing
        return ticket;
      }

      // Re-evaluate SLA status
      // In real scenario, elapsed days might freeze on Selesai, but we simulate it nicely
      let slaStatus: SlaStatus = 'On Time';
      if (nextStatus !== 'Selesai') {
        if (ticket.elapsedDays >= ticket.slaDays) {
          slaStatus = 'Overdue';
        } else if (ticket.elapsedDays >= ticket.slaDays - 1) {
          slaStatus = 'Warning';
        }
      } else {
        // If completed, check if it was completed on time or overdue
        slaStatus = ticket.elapsedDays > ticket.slaDays ? 'Overdue' : 'On Time';
      }

      return {
        ...ticket,
        status: nextStatus,
        slaStatus
      };
    });

    onTicketsChange(updated);
  };

  // Add custom new ticket
  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;

    const randNo = Math.floor(100 + Math.random() * 900);
    const ticket: Ticket = {
      id: `t_${Date.now()}`,
      ticketNo: `TKT-2026-${randNo}`,
      title: newTicket.title,
      type: newTicket.type,
      city: newTicket.city,
      date: new Date().toISOString().split('T')[0],
      slaDays: Number(newTicket.slaDays),
      elapsedDays: 0,
      status: 'Belum Diproses',
      slaStatus: 'On Time',
    };

    onTicketsChange([ticket, ...tickets]);
    setNewTicket({
      title: '',
      type: 'Informasi',
      city: availableCities[0] || 'Jakarta',
      slaDays: 3,
    });
    setShowAddForm(false);
  };

  // Delete ticket
  const handleDeleteTicket = (id: string) => {
    onTicketsChange(tickets.filter(t => t.id !== id));
  };

  // Filtered ticket rows
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.ticketNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesSla = slaFilter === 'ALL' || t.slaStatus === slaFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSla;
    });
  }, [tickets, searchTerm, typeFilter, statusFilter, slaFilter]);

  return (
    <div id="sla-operational-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-500 h-6 w-6" />
            SLA Tindaklanjut & Antrean Layanan Operasional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring waktu penanganan laporan berdasarkan target SLA (Service Level Agreement). Lakukan tindaklanjut langsung.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 self-start shadow-sm cursor-pointer"
          id="toggle-add-ticket-form-button"
        >
          <PlusCircle className="h-4 w-4" />
          {showAddForm ? 'Batal Tambah' : 'Tambah Laporan Baru'}
        </button>
      </div>

      {/* SLA METRIC WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SLA COMPLIANCE */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Kepatuhan SLA Total</span>
            <span className={`text-2xl font-extrabold tracking-tight block ${
              stats.compliance >= 90 ? 'text-emerald-600' : stats.compliance >= 80 ? 'text-amber-600' : 'text-rose-600'
            }`}>{stats.compliance}%</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Rasio laporan selesai sesuai target SLA</span>
          </div>
          <div className={`p-3 rounded-xl ${stats.compliance >= 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* ON TIME ACTIVE */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Aman (On Time)</span>
            <span className="text-2xl font-extrabold tracking-tight block text-emerald-600">{stats.onTime}</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Waktu penanganan masih di bawah target</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* WARNING */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Peringatan (H-1)</span>
            <span className="text-2xl font-extrabold tracking-tight block text-amber-600">{stats.warning}</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Mendekati tenggat batas waktu SLA</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* OVERDUE */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Terlambat (Overdue)</span>
            <span className="text-2xl font-extrabold tracking-tight block text-rose-600">{stats.overdue}</span>
            <span className="text-[9px] text-slate-500 mt-1 block">Penanganan melampaui batas target SLA</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ADD TICKET FORM PANEL (COLLAPSIBLE) */}
      {showAddForm && (
        <form onSubmit={handleAddTicket} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-slideDown shadow-xs text-slate-800">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            <PlusCircle className="text-indigo-600 h-4 w-4" />
            Input Laporan Baru Ke Sistem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-505 mb-1 font-medium">Judul Permohonan / Aduan <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                placeholder="cth: Pengaduan Saluran Air Tersumbat Jalan Slamet"
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="ticket-title-input"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-505 mb-1 font-medium">Jenis Layanan</label>
              <select
                value={newTicket.type}
                onChange={(e) => setNewTicket(prev => ({ ...prev, type: e.target.value as LayananType }))}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="ticket-type-select"
              >
                <option value="Informasi">Informasi</option>
                <option value="Permintaan">Permintaan</option>
                <option value="Pengaduan">Pengaduan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-505 mb-1 font-medium">Kota Penempatan</label>
              <select
                value={newTicket.city}
                onChange={(e) => setNewTicket(prev => ({ ...prev, city: e.target.value }))}
                className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="ticket-city-select"
              >
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              <label className="block text-xs text-slate-505 mb-1 font-medium">Target Penyelesaian SLA (Hari)</label>
              <input
                type="number"
                min={1}
                max={15}
                value={newTicket.slaDays}
                onChange={(e) => setNewTicket(prev => ({ ...prev, slaDays: Number(e.target.value) }))}
                className="w-24 bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-xs text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="ticket-sla-days-input"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              id="submit-ticket-button"
            >
              Simpan Laporan
            </button>
          </div>
        </form>
      )}

      {/* FILTER PANEL */}
      <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800 shadow-xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No. Tiket, Judul Laporan, atau Kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
            id="ticket-search-input"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Jenis:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-bold focus:outline-none cursor-pointer"
              id="filter-type-select"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="Informasi">Informasi</option>
              <option value="Permintaan">Permintaan</option>
              <option value="Pengaduan">Pengaduan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs text-slate-700">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-bold focus:outline-none cursor-pointer"
              id="filter-status-select"
            >
              <option value="ALL">Semua Status</option>
              <option value="Belum Diproses">Belum Diproses</option>
              <option value="Sedang Diproses">Sedang Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs text-slate-700">
            <span className="text-slate-400 font-medium">SLA:</span>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-bold focus:outline-none cursor-pointer"
              id="filter-sla-status-select"
            >
              <option value="ALL">Semua SLA</option>
              <option value="On Time">On Time</option>
              <option value="Warning">Warning</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* TICKETS TABLE */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse" id="tickets-table">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider bg-slate-50/75">
              <th className="px-4 py-3.5">No. Tiket</th>
              <th className="px-4 py-3.5">Judul Laporan</th>
              <th className="px-4 py-3.5">Jenis</th>
              <th className="px-4 py-3.5">Kota</th>
              <th className="px-4 py-3.5">Tanggal</th>
              <th className="px-4 py-3.5">Hari Berjalan / SLA</th>
              <th className="px-4 py-3.5">Status SLA</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-center">Aksi Operasional</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                // Determine SLA badge styles
                let slaBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                if (ticket.slaStatus === 'Warning') slaBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                else if (ticket.slaStatus === 'Overdue') slaBadge = 'bg-rose-50 text-rose-700 border border-rose-100';

                // Determine Status badge styles
                let statusBadge = 'bg-slate-100 text-slate-600 border border-slate-200';
                if (ticket.status === 'Sedang Diproses') statusBadge = 'bg-blue-50 text-blue-700 border border-blue-100';
                else if (ticket.status === 'Selesai') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';

                // Determine type label style
                let typeColor = 'text-indigo-600';
                if (ticket.type === 'Permintaan') typeColor = 'text-teal-600';
                else if (ticket.type === 'Pengaduan') typeColor = 'text-amber-600';

                return (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-500">{ticket.ticketNo}</td>
                    <td className="px-4 py-3.5 max-w-xs truncate font-medium text-slate-800" title={ticket.title}>{ticket.title}</td>
                    <td className={`px-4 py-3.5 font-bold ${typeColor}`}>{ticket.type}</td>
                    <td className="px-4 py-3.5 text-slate-600">{ticket.city}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">{ticket.date}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono">
                      <span className="font-bold text-slate-800">{ticket.elapsedDays}</span> / {ticket.slaDays} hari
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${slaBadge}`}>
                        {ticket.slaStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusBadge}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {ticket.status !== 'Selesai' ? (
                          <button
                            onClick={() => handleFollowUp(ticket.id)}
                            className="bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 text-indigo-700 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            title={ticket.status === 'Belum Diproses' ? 'Mulai kerjakan' : 'Selesaikan laporan'}
                            id={`action-followup-${ticket.id}`}
                          >
                            <span>Tindaklanjut</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Selesai
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus laporan"
                          id={`action-delete-${ticket.id}`}
                        >
                          <Clock className="h-3.5 w-3.5 stroke-2 rotate-45" /> {/* Use as cross symbol if needed, or simply delete */}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Activity className="h-8 w-8 text-slate-300 animate-pulse" />
                    <p className="font-bold text-slate-600">Tidak ada laporan yang cocok dengan filter saat ini.</p>
                    <p className="text-[11px] text-slate-400">Sesuaikan kata kunci pencarian atau ganti pilihan filter Anda.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
