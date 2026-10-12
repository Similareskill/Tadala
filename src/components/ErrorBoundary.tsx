import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8ff] dark:bg-[#0b0f19] flex items-center justify-center p-6 text-[#131b2e] dark:text-[#f1f5f9]">
          <div className="bg-white dark:bg-[#131826] border border-[#e2e8f0] dark:border-[#222b3e] rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold font-display">
                Algo inesperado aconteceu
              </h2>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1.5 leading-relaxed">
                Um erro inesperado foi interceptado com segurança para proteger seus dados salvos.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182030] text-[11px] font-mono text-slate-700 dark:text-slate-300 text-left overflow-x-auto max-h-24 border border-slate-200 dark:border-slate-700">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#2a14b4] hover:bg-[#200e94] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recarregar Aplicativo</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
