import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>
            
            {this.state.error && (
              <div className="mb-6 text-left">
                <details className="bg-muted/50 rounded-md p-4">
                  <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong className="text-sm">Error:</strong>
                      <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong className="text-sm">Component Stack:</strong>
                        <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary