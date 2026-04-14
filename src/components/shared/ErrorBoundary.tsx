import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-6 max-w-2xl w-full">
            <h1 className="text-red-400 text-xl font-bold mb-2">Application Error</h1>
            <p className="text-slate-300 text-sm mb-4">
              The app crashed before it could render. Copy the error below and open an issue.
            </p>
            <pre className="bg-slate-900 rounded-lg p-4 text-xs text-red-300 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
