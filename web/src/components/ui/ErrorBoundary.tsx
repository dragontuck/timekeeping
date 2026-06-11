import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback ?? (
                    <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
                        <div className="text-4xl">⚠️</div>
                        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                        <p className="text-gray-600 max-w-md">
                            {this.state.error?.message ?? 'An unexpected error occurred.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800"
                        >
                            Reload page
                        </button>
                    </div>
                )
            );
        }
        return this.props.children;
    }
}
