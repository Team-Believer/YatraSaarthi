import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  isRouteLevel?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[YatraSaarthi ErrorBoundary Caught Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/app';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const isRoute = this.props.isRouteLevel;
      const title = this.props.fallbackTitle || (isRoute ? 'Page Error' : 'Something went wrong');
      const message =
        this.props.fallbackMessage ||
        (isRoute
          ? 'This section encountered an unexpected error. You can reload or navigate to another page.'
          : 'YatraSaarthi encountered an unexpected issue. The application has isolated the error.');

      return (
        <div
          className={`w-full flex items-center justify-center p-6 select-none font-sans ${
            isRoute ? 'min-h-[400px] h-full' : 'min-h-screen bg-slate-50'
          }`}
        >
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{message}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#083335] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#0c4447] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </button>

              {isRoute && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <span>Try Again</span>
                </button>
              )}
            </div>

            {/* Diagnostic Details (Collapsible) */}
            {this.state.error && (
              <div className="pt-3 border-t border-slate-100 text-left">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between w-full text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span>Diagnostic Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto space-y-1">
                    <p className="text-rose-400 font-bold">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.error.stack && (
                      <pre className="text-slate-400 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-slate-500 whitespace-pre-wrap mt-2 border-t border-slate-800 pt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
