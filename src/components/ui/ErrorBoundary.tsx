"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500/70 mx-auto mb-3" />
          <h2 className="text-sm font-medium text-zinc-300 typewriter-label mb-2">Something went wrong</h2>
          <p className="text-[10px] text-zinc-600 mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-amber-600 text-black rounded hover:bg-amber-500 typewriter-label transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            TRY AGAIN
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}