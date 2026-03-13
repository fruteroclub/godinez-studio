import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sentry (monitoreo externo)
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    
    // Error Observatory (monitoreo interno para Watchdog)
    fetch("/api/admin/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "REACT_ERROR",
        message: error.message,
        userMessage: "Algo salió mal en la aplicación. Intenta recargar la página.",
        priority: "P1",
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata: {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        },
      }),
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Algo salió mal
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
