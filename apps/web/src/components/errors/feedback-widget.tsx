import { useState, Component, type ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSubmitFeedback } from "@/hooks/use-errors";
import { MessageSquare, X, Send, Check, AlertTriangle, RefreshCw } from "lucide-react";

// ============================================
// ERROR BOUNDARY (captura errores de React)
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.reportError(error, errorInfo);
  }

  async reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await fetch("/api/admin/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "REACT_ERROR",
          message: error.message,
          userMessage: "Algo salió mal en la aplicación. Intenta recargar la página.",
          priority: "P1",
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          metadata: {
            stack: error.stack,
            componentStack: errorInfo.componentStack,
          },
        }),
      });
    } catch (e) {
      console.error("Failed to report error:", e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              ¡Ups! Algo salió mal
            </h1>
            <p className="text-zinc-400 mb-6">
              Ocurrió un error inesperado. Ya lo registramos y lo revisaremos pronto.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// FEEDBACK WIDGET - Simplificado
// ============================================

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { user } = useUser();
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await submitFeedback.mutateAsync({
        type: "comment",
        message: message.trim(),
        email: user?.primaryEmailAddress?.emailAddress,
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage("");
      }, 2000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 z-50"
        aria-label="Soporte"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="font-semibold text-white">Soporte</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {submitted ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-white font-medium">¡Gracias!</p>
          <p className="text-sm text-zinc-400 mt-1">Tu mensaje ha sido enviado</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Greeting */}
          <p className="text-sm text-zinc-300">
            ¡Hola! Soy tu asistente técnico. ¿En qué te puedo apoyar? Describe brevemente qué está pasando.
          </p>

          {/* Message */}
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!message.trim() || submitFeedback.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submitFeedback.isPending ? (
              "Enviando..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
