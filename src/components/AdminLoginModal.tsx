import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { adminAuthService, ADMIN_PRESET_EMAILS, DEFAULT_ADMIN_PASSWORD } from '../services/adminAuth';
import { activityLogService } from '../services/activityLogService';
import { playHapticSound } from '../utils/helpers';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  actionReason?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionReason,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha do Administrador.');
      return;
    }

    setLoading(true);
    playHapticSound('toggle');

    try {
      const res = await adminAuthService.login(email.trim(), password, remember);
      if (res.success) {
        playHapticSound('toggle');
        activityLogService.log({
          type: 'admin_login',
          title: 'Login de Administrador Realizado',
          description: `Sessão de Administrador iniciada (${email.trim()}). Permissão total de modificação liberada.`,
          userName: email.trim(),
          userRole: 'admin',
        });
        onSuccess(`Login de Administrador confirmado! Permissão total liberada.`);
        onClose();
      } else {
        setErrorMessage(res.error || 'E-mail ou senha de administrador incorretos.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as { message?: string })?.message || 'Falha ao processar acesso de administrador.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 bg-gradient-to-r from-[#1e145f] via-[#2a14b4] to-[#4338ca] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 backdrop-blur-xs flex items-center justify-center border border-amber-300/30 text-amber-300 shadow-inner">
              <Crown className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display leading-tight">
                  Login de Administrador
                </h2>
                <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-0.5">
                Apenas o login de Admin tem permissão para modificar e editar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason banner if triggered by a restricted action */}
        {actionReason && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Ação restrita: Para <strong>{actionReason}</strong>, confirme o login de Administrador.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Quick Admin Account Selector */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-3 space-y-1.5">
            <div className="text-[11px] font-bold text-[#475569] flex items-center justify-between">
              <span>Contas de Admin Disponíveis:</span>
              <span className="text-[10px] text-[#94a3b8] font-normal">Clique para preencher</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { email: 'admin@tadalamanu.com', name: 'Manu' },
                { email: 'admin@tadalathorinha.com', name: 'Thorinha' },
                { email: 'admin@tadalatorean.com', name: 'Torean' },
                { email: 'leandrotemoteo123@gmail.com', name: 'Leandro' },
                { email: 'admin@gestaodecompras.com', name: 'Geral' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(DEFAULT_ADMIN_PASSWORD);
                    playHapticSound('click');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    email.toLowerCase() === acc.email.toLowerCase()
                      ? 'bg-[#2a14b4] text-white border-[#2a14b4] shadow-2xs'
                      : 'bg-white hover:bg-[#eaedff] text-[#334155] border-[#cbd5e1]'
                  }`}
                >
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span>{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email input */}
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">
              E-mail do Administrador
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tadalamanu.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-xs font-medium text-[#131b2e] transition-all focus:outline-none"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#334155]">
                Senha de Administrador
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha de administrador"
                className="w-full pl-10 pr-10 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-xs font-medium text-[#131b2e] transition-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember on this device */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[#cbd5e1] text-[#2a14b4] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#2a14b4]"
            />
            <span className="text-xs text-[#475569] font-medium">
              Manter Administrador conectado neste dispositivo
            </span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2a14b4] hover:bg-[#200e94] active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all duration-150 shadow-md shadow-indigo-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar como Administrador</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
