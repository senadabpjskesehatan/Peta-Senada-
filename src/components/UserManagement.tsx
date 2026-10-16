import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Landmark,
  Building2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Lock,
  UserCheck,
  UserX,
  Info,
  Check,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AppUser, UserRole, UserStatus } from '../types';

interface UserManagementProps {
  users: AppUser[];
  onUsersChange: (newUsers: AppUser[]) => void;
  currentUserId?: string;
}

export default function UserManagement({
  users,
  onUsersChange,
  currentUserId = 'user_admin_senada'
}: UserManagementProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<AppUser | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<AppUser | null>(null);

  // Add User Form State (Exactly 4 fields: Nama User, Hak Akses, Status, Password)
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kepwil');
  const [newStatus, setNewStatus] = useState<UserStatus>('aktif');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // Edit User Form State
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('kepwil');
  const [editStatus, setEditStatus] = useState<UserStatus>('aktif');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Reset Password Modal Form State
  const [newPassVal, setNewPassVal] = useState('');
  const [confirmPassVal, setConfirmPassVal] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);

  // Visibility map for password columns (optional toggle in table)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter(user => {
      const matchSearch = !q ||
        user.username.toLowerCase().includes(q) ||
        (user.displayName && user.displayName.toLowerCase().includes(q));
      const matchRole = roleFilter === 'all' || user.role === roleFilter;
      const matchStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  const paginatedUsers = useMemo(() => {
    if (pageSize === -1) return filteredUsers;
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'aktif').length;
    const inactive = users.filter(u => u.status === 'nonaktif').length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const kepwilCount = users.filter(u => u.role === 'kepwil').length;
    const pusatCount = users.filter(u => u.role === 'kantor_pusat').length;
    const cabangCount = users.filter(u => u.role === 'kantor_cabang').length;
    return { total, active, inactive, adminCount, kepwilCount, pusatCount, cabangCount };
  }, [users]);

  // Handle Quick Toggle Status
  const handleToggleStatus = (user: AppUser) => {
    if (user.username.toLowerCase() === 'senada') {
      showToast('User "senada" adalah akun utama Administrator dan tidak dapat dinonaktifkan.');
      return;
    }
    const nextStatus: UserStatus = user.status === 'aktif' ? 'nonaktif' : 'aktif';
    const updated = users.map(u => (u.id === user.id ? { ...u, status: nextStatus, updatedAt: new Date().toISOString() } : u));
    onUsersChange(updated);
    showToast(`Status user "${user.username}" diubah menjadi ${nextStatus.toUpperCase()}`);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setNewUsername('');
    setNewRole('kepwil');
    setNewStatus('aktif');
    setNewPassword('');
    setShowNewPassword(false);
    setAddFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add User
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    const cleanName = newUsername.trim();
    if (!cleanName) {
      setAddFormError('Nama User wajib diisi');
      return;
    }
    if (cleanName.length < 3) {
      setAddFormError('Nama User minimal 3 karakter');
      return;
    }
    if (users.some(u => u.username.toLowerCase() === cleanName.toLowerCase())) {
      setAddFormError(`User dengan nama "${cleanName}" sudah terdaftar`);
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setAddFormError('Password minimal 4 karakter');
      return;
    }

    const newUser: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanName,
      role: newRole,
      status: newStatus,
      password: newPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    onUsersChange(updated);
    setIsAddModalOpen(false);
    showToast(`User baru "${cleanName}" berhasil ditambahkan!`);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditPassword('');
    setShowEditPassword(false);
    setEditFormError(null);
  };

  // Submit Edit User
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditFormError(null);

    const cleanName = editUsername.trim();
    if (!cleanName) {
      setEditFormError('Nama User wajib diisi');
      return;
    }

    const duplicate = users.find(u => u.id !== editingUser.id && u.username.toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      setEditFormError(`User dengan nama "${cleanName}" sudah digunakan oleh user lain`);
      return;
    }

    // Protection for primary 'senada' account
    const isSenada = editingUser.username.toLowerCase() === 'senada';
    const finalRole: UserRole = isSenada ? 'admin' : editRole;
    const finalStatus: UserStatus = isSenada ? 'aktif' : editStatus;

    const updated = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          username: cleanName,
          role: finalRole,
          status: finalStatus,
          password: editPassword.trim() ? editPassword.trim() : u.password,
          updatedAt: new Date().toISOString(),
        };
      }
      return u;
    });

    onUsersChange(updated);
    setEditingUser(null);
    showToast(`Data user "${cleanName}" berhasil diperbarui!`);
  };

  // Open Password Modal
  const handleOpenPasswordModal = (user: AppUser) => {
    setPasswordModalUser(user);
    setNewPassVal('');
    setConfirmPassVal('');
    setShowResetPass(false);
    setPasswordFormError(null);
  };

  // Submit Change Password
  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setPasswordFormError(null);

    if (!newPassVal || newPassVal.length < 4) {
      setPasswordFormError('Password baru minimal 4 karakter');
      return;
    }
    if (newPassVal !== confirmPassVal) {
      setPasswordFormError('Konfirmasi password tidak cocok');
      return;
    }

    const updated = users.map(u => {
      if (u.id === passwordModalUser.id) {
        return {
          ...u,
          password: newPassVal,
          updatedAt: new Date().toISOString(),
        };
      }
      return u;
    });

    onUsersChange(updated);
    setPasswordModalUser(null);
    showToast(`Password untuk user "${passwordModalUser.username}" berhasil diubah!`);
  };

  // Confirm and Delete User
  const handleConfirmDelete = () => {
    if (!deleteModalUser) return;
    if (deleteModalUser.username.toLowerCase() === 'senada') {
      showToast('User "senada" adalah akun utama Administrator dan tidak dapat dihapus.');
      setDeleteModalUser(null);
      return;
    }

    const updated = users.filter(u => u.id !== deleteModalUser.id);
    onUsersChange(updated);
    showToast(`User "${deleteModalUser.username}" telah dihapus.`);
    setDeleteModalUser(null);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Helper for role styling and label
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            User Admin
          </span>
        );
      case 'kepwil':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Landmark className="w-3.5 h-3.5 text-emerald-600" />
            User Kepwil
          </span>
        );
      case 'kantor_pusat':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            User Kantor Pusat
          </span>
        );
      case 'kantor_cabang':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Building2 className="w-3.5 h-3.5 text-sky-600" />
            User Kantor Cabang
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-semibold border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Manajemen User & Hak Akses</h3>
              <p className="text-xs text-slate-500 font-medium">
                Kelola akun pengguna, hak akses menu, reset password, dan status aktif/nonaktif sistem SENADA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            id="btn-tambah-user"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah User Baru</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama atau kode user (cth: 101, Banda Aceh)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            id="search-user-input"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Hak Akses ({users.length})</option>
              <option value="admin">Admin ({stats.adminCount})</option>
              <option value="kepwil">Kepwil ({stats.kepwilCount})</option>
              <option value="kantor_pusat">Kantor Pusat ({stats.pusatCount})</option>
              <option value="kantor_cabang">Kantor Cabang ({stats.cabangCount})</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Semua Status ({users.length})</option>
              <option value="aktif">Aktif ({stats.active})</option>
              <option value="nonaktif">Nonaktif ({stats.inactive})</option>
            </select>
          </div>
        </div>
      </div>

      {/* USER LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-800">Daftar Pengguna Sistem ({filteredUsers.length})</h4>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Update tersimpan realtime</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{stats.active} Aktif</span>
            <span className="text-slate-300">|</span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
            <span>{stats.inactive} Nonaktif</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama User</th>
                <th className="py-3.5 px-4">Hak Akses</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Kata Sandi</th>
                <th className="py-3.5 px-4 text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <UserX className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  const isSenada = user.username.toLowerCase() === 'senada';
                  const isVisiblePass = !!visiblePasswords[user.id];
                  const itemIndex = (pageSize === -1 ? idx : (currentPage - 1) * pageSize + idx) + 1;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                        {itemIndex}
                      </td>

                      {/* Nama User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                              user.role === 'admin'
                                ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'
                                : user.role === 'kepwil'
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                : 'bg-gradient-to-br from-sky-500 to-blue-500 text-white'
                            }`}
                          >
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{user.username}</span>
                              {isSenada && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-amber-200">
                                  Default Admin
                                </span>
                              )}
                            </div>
                            {user.displayName ? (
                              <span className="text-xs text-slate-500 font-semibold block">
                                {user.displayName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 block font-normal">
                                ID: {user.id.substring(0, 14)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Hak Akses */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Status Akun + Quick Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={isSenada}
                            title={
                              isSenada
                                ? 'Akun default admin tidak dapat dinonaktifkan'
                                : `Klik untuk mengubah status menjadi ${user.status === 'aktif' ? 'Nonaktif' : 'Aktif'}`
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isSenada ? 'opacity-70 cursor-not-allowed' : ''
                            } ${user.status === 'aktif' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                user.status === 'aktif' ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {user.status === 'aktif' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Nonaktif
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kata Sandi (Masked + View toggle) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200">
                            {isVisiblePass ? user.password : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                            title={isVisiblePass ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {isVisiblePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Rubah Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(user)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                            title="Rubah / Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            title="Edit Data User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Hapus User */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalUser(user)}
                            disabled={isSenada}
                            className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                              isSenada
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 cursor-pointer'
                            }`}
                            title={isSenada ? 'Akun default admin tidak dapat dihapus' : 'Hapus User'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        {filteredUsers.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-500">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-3xs"
              >
                <option value={15}>15 baris</option>
                <option value={30}>30 baris</option>
                <option value={50}>50 baris</option>
                <option value={-1}>Semua ({filteredUsers.length})</option>
              </select>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-slate-600">
                {pageSize === -1
                  ? `Menampilkan seluruh ${filteredUsers.length} pengguna`
                  : `Menampilkan ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredUsers.length)} dari ${filteredUsers.length} pengguna`}
              </span>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 font-extrabold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-3xs">
                  Hal. {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: TAMBAH USER BARU */}
      {/* Sesuai instruksi: hanya mengisi Nama User, Hak Akses, Status user, Password */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Tambah User Baru</h3>
                  <p className="text-xs text-slate-300">Buat kredensial baru untuk pengguna sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-6 space-y-4">
              {addFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addFormError}</span>
                </div>
              )}

              {/* 1. Nama User */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  1. Nama User <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: kepwil_jateng atau kc_surakarta"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  id="form-add-username"
                />
              </div>

              {/* 2. Hak Akses (Dropdown) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  2. Hak Akses <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  id="form-add-role"
                >
                  <option value="admin">User Admin (Akses seluruh menu & manajemen user)</option>
                  <option value="kepwil">User Kepwil (Menu Peta Nasional, Overview & SMS - View & Filter saja)</option>
                  <option value="kantor_pusat">User Kantor Pusat (Menu Peta Nasional, SMS, Overview & Pemanfaatan Data - View & Filter saja)</option>
                  <option value="kantor_cabang">User Kantor Cabang (Menu Peta Nasional, Overview & SMS - View & Filter saja)</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {newRole === 'admin'
                    ? '✓ Akses seluruh menu dan aksi pengelolaan data.'
                    : newRole === 'kantor_pusat'
                    ? '✓ Akses melihat & memfilter data pada menu Peta Nasional, SMS, Overview, dan Pemanfaatan Data.'
                    : '✓ Akses melihat & memfilter data pada menu Peta Nasional, Overview, dan SMS.'}
                </p>
              </div>

              {/* 3. Status user aktif/nonaktif (Dropdown) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  3. Status User <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  id="form-add-status"
                >
                  <option value="aktif">Aktif (Dapat login ke sistem)</option>
                  <option value="nonaktif">Nonaktif (Akses ditolak saat login)</option>
                </select>
              </div>

              {/* 4. Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  4. Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan kata sandi (min. 4 karakter)"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    id="form-add-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  id="btn-submit-add-user"
                >
                  <Check className="w-4 h-4" />
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Edit Data User</h3>
                  <p className="text-xs text-slate-300">Ubah data pengguna {editingUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {editFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* 1. Nama User */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Nama User</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* 2. Hak Akses (Dropdown) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Hak Akses</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingUser.username.toLowerCase() === 'senada'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
                >
                  <option value="admin">User Admin (Akses seluruh menu & manajemen user)</option>
                  <option value="kepwil">User Kepwil (Menu Peta Nasional, Overview & SMS - View & Filter saja)</option>
                  <option value="kantor_pusat">User Kantor Pusat (Menu Peta Nasional, SMS, Overview & Pemanfaatan Data - View & Filter saja)</option>
                  <option value="kantor_cabang">User Kantor Cabang (Menu Peta Nasional, Overview & SMS - View & Filter saja)</option>
                </select>
                {editingUser.username.toLowerCase() === 'senada' && (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    * Akun "senada" tetap sebagai User Admin utama sistem.
                  </p>
                )}
              </div>

              {/* 3. Status user aktif/nonaktif */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Status User</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  disabled={editingUser.username.toLowerCase() === 'senada'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
                >
                  <option value="aktif">Aktif (Dapat login)</option>
                  <option value="nonaktif">Nonaktif (Akses ditolak saat login)</option>
                </select>
              </div>

              {/* 4. Password Baru (Opsional saat Edit) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password Baru <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Biarkan kosong jika tidak diganti"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Perbarui User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RUBAH / RESET PASSWORD */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Rubah Password</h3>
                  <p className="text-xs text-amber-100">User: {passwordModalUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
              {passwordFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{passwordFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Password Baru</label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    value={newPassVal}
                    onChange={(e) => setNewPassVal(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Konfirmasi Password Baru</label>
                <input
                  type={showResetPass ? 'text' : 'password'}
                  value={confirmPassVal}
                  onChange={(e) => setConfirmPassVal(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: KONFIRMASI HAPUS USER */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-scaleIn text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">Hapus Pengguna?</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus akun user{' '}
                <strong className="text-slate-800 font-bold">{deleteModalUser.username}</strong>?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex-1"
              >
                Hapus User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
