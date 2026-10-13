import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, X, Check, ShieldCheck } from 'lucide-react';
import { AppUser } from '../types';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onSuccess: (newPassword: string) => void;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}: ResetPasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOldPass = oldPassword.trim();
    const cleanNewPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    // 1. Validasi Password Lama Wajib Diisi
    if (!cleanOldPass) {
      setError('Password lama wajib dimasukkan.');
      return;
    }

    // 2. Verifikasi Kecocokan Password Lama
    const expectedOldPassword = currentUser.password || (currentUser.role === 'admin' ? '150bisa' : '');
    if (expectedOldPassword && cleanOldPass !== expectedOldPassword) {
      setError('Password lama yang Anda masukkan salah. Harap periksa kembali.');
      return;
    }

    // 3. Validasi Password Baru
    if (!cleanNewPass) {
      setError('Password baru tidak boleh kosong.');
      return;
    }

    if (cleanNewPass.length < 4) {
      setError('Password baru minimal 4 karakter.');
      return;
    }

    if (cleanNewPass === cleanOldPass) {
      setError('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    // 4. Validasi Konfirmasi Password Baru
    if (cleanNewPass !== cleanConfirm) {
      setError('Konfirmasi password baru tidak cocok. Harap periksa kembali.');
      return;
    }

    onSuccess(cleanNewPass);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Rubah Password Akun</h3>
              <p className="text-xs text-slate-300">Masukkan password lama untuk mengatur password baru</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* USER INFO BADGE */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 ${
                currentUser.role === 'admin'
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                  : currentUser.role === 'kepwil'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-sky-500 to-blue-500'
              }`}>
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate">
                  {currentUser.username}
                </span>
                {currentUser.displayName && (
                  <span className="text-[11px] text-slate-500 font-medium block truncate">
                    {currentUser.displayName}
                  </span>
                )}
              </div>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border shrink-0 ${
              currentUser.role === 'admin'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : currentUser.role === 'kepwil'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}>
              {currentUser.role === 'admin' ? 'User Admin' : currentUser.role === 'kepwil' ? 'User Kepwil' : 'User KC'}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* INPUT 1: PASSWORD LAMA (WAJIB) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Password Lama <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password lama akun Anda"
                required
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                id="input-self-old-password"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showOldPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* INPUT 2: PASSWORD BARU */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru (min. 4 karakter)"
                required
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                id="input-self-new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showNewPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* INPUT 3: KONFIRMASI PASSWORD BARU */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Ulangi Password Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                required
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                id="input-self-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showConfirmPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Password baru akan langsung berlaku untuk login berikutnya.
          </p>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              id="btn-submit-self-reset-password"
            >
              <Check className="w-4 h-4" />
              Rubah Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
