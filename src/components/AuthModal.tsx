import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { authService } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'apelido' | 'login' | 'register'>('apelido');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConsoleHelper, setShowConsoleHelper] = useState(false);

  if (!isOpen) return null;

  const firebaseConsoleUrl =
    'https://console.firebase.google.com/project/cedar-arena-zcbh2/authentication/providers';

  const getPortugueseAuthError = (err: unknown): string => {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'auth/operation-not-allowed':
          setShowConsoleHelper(true);
          return 'O provedor de autenticação com E-mail e Senha ainda não está ativado no Firebase Console para este projeto.';
        case 'auth/email-already-in-use':
          return 'Este e-mail já está cadastrado. Tente entrar na sua conta.';
        case 'auth/invalid-email':
          return 'O formato do e-mail é inválido.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return 'E-mail ou senha incorretos.';
        case 'auth/weak-password':
          return 'A senha deve conter no mínimo 6 caracteres.';
        case 'auth/popup-closed-by-user':
          return 'A janela do Google foi fechada antes de concluir o login.';
        case 'auth/too-many-requests':
          return 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
        case 'auth/network-request-failed':
          return 'Falha na conexão de rede. Verifique sua internet.';
        default:
          return (err as { message?: string }).message || 'Ocorreu um erro na autenticação.';
      }
    }
    return 'Ocorreu um erro ao processar seu acesso.';
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    setShowConsoleHelper(false);
    try {
      const loggedUser = await authService.signInWithGoogle();
      onSuccess(`Bem-vindo(a), ${loggedUser.displayName || loggedUser.email || 'Usuário'}!`);
      onClose();
    } catch (err) {
      setErrorMessage(getPortugueseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setShowConsoleHelper(false);

    if (mode === 'apelido') {
      if (!displayName.trim()) {
        setErrorMessage('Por favor, informe um nome ou apelido para identificar seus itens.');
        return;
      }
      // Save local nickname profile
      localStorage.setItem('shopping_user_name', displayName.trim());
      onSuccess(`Conectado como ${displayName.trim()}! Seus itens são sincronizados em tempo real.`);
      onClose();
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('A senha precisa ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await authService.signUp(email.trim(), password, displayName.trim());
        onSuccess(
          `Conta criada com sucesso! Bem-vindo(a) ${displayName.trim() || email.split('@')[0]}!`
        );
      } else {
        await authService.signIn(email.trim(), password);
        onSuccess('Login realizado com sucesso!');
      }
      onClose();
    } catch (err) {
      setErrorMessage(getPortugueseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#e2e8f0] animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-[#2a14b4] to-[#4338ca] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display leading-tight">
                {mode === 'apelido'
                  ? 'Acesso Sem Senha (100% Livre)'
                  : mode === 'login'
                  ? 'Entrar com E-mail'
                  : 'Criar Nova Conta'}
              </h2>
              <p className="text-xs text-white/80">
                Sincronize sua lista em tempo real em todos os dispositivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers: Sem Senha (1º) / Entrar / Cadastrar */}
        <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc]">
          <button
            type="button"
            onClick={() => {
              setMode('apelido');
              setErrorMessage('');
              setShowConsoleHelper(false);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              mode === 'apelido'
                ? 'border-[#2a14b4] text-[#2a14b4] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#131b2e]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sem Senha (Livre)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setShowConsoleHelper(false);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              mode === 'login'
                ? 'border-[#2a14b4] text-[#2a14b4] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#131b2e]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setShowConsoleHelper(false);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              mode === 'register'
                ? 'border-[#2a14b4] text-[#2a14b4] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#131b2e]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Special Helper for auth/operation-not-allowed */}
          {showConsoleHelper && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Como ativar Login por E-mail no Firebase:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-amber-800/90 text-xs font-medium">
                <li>
                  No Firebase, o provedor <strong>E-mail/senha</strong> vem desativado por padrão em projetos novos.
                </li>
                <li>
                  Clique no botão abaixo para abrir a página de provedores de autenticação do seu projeto:
                </li>
                <li>
                  Clique em <strong>E-mail/senha</strong> &gt; ative a opção <strong>Habilitar</strong> &gt; clique em <strong>Salvar</strong>.
                </li>
              </ol>

              <a
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Abrir Firebase Console (Sign-in providers)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200/80">
                💡 Dica: Você também pode usar o botão <strong>Continuar com Google</strong> acima ou a aba <strong>Apelido da Casa</strong> sem precisar configurar nada!
              </p>
            </div>
          )}

          {/* Mode: Acesso Sem Senha (Zero barreiras, instant multi-user) */}
          {mode === 'apelido' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <span>100% Livre de Barreiras de Bloqueio</span>
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                      ATIVO
                    </span>
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    Você e qualquer pessoa com o link podem adicionar itens, marcar compras e atualizar a lista instantaneamente. Nenhuma senha ou bloqueio é imposto!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-150 shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Continuar Usando a Lista (Sem Senha)</span>
              </button>

              <div className="pt-2 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#1e293b] flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Ou vincular com Google (Opcional)</span>
                </button>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Personalizar Nome do Aparelho (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Leandro, Celular da Maria..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-xs font-medium text-[#131b2e] transition-all focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2a14b4] hover:bg-[#200e94] text-white font-bold rounded-xl text-xs transition-all duration-150 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Nome do Aparelho</span>
              </button>
            </div>
          ) : (
            /* Mode: Login or Register with Email & Password */
            <>
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Nome ou Apelido
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Leandro"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  E-mail <span className="text-rose-500">*</span>
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
                    placeholder="seuemail@exemplo.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Senha <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#475569] cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Only on Register) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Confirmar Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#2a14b4] focus:bg-white rounded-xl text-sm font-medium text-[#131b2e] transition-all focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#2a14b4] hover:bg-[#200e94] disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all duration-150 shadow-md shadow-indigo-900/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar com E-mail e Senha</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Criar Conta com E-mail</span>
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
