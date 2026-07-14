import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
  info: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: '' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
    console.error('React app crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#060814',
          color: '#f43f5e',
          fontFamily: 'monospace',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h1 style={{ color: '#f43f5e', fontSize: '22px', marginBottom: '8px' }}>
            ⚠️ App Crashed – Error Caught by ErrorBoundary
          </h1>
          <div style={{
            background: '#0d1424',
            border: '1px solid #f43f5e44',
            borderRadius: '8px',
            padding: '16px',
            color: '#cbd5e1',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            <strong style={{ color: '#f43f5e' }}>Error:</strong>{'\n'}
            {this.state.error?.message}{'\n\n'}
            <strong style={{ color: '#f43f5e' }}>Stack:</strong>{'\n'}
            {this.state.error?.stack}
          </div>
          {this.state.info && (
            <div style={{
              background: '#0d1424',
              border: '1px solid #33415544',
              borderRadius: '8px',
              padding: '16px',
              color: '#64748b',
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
            }}>
              <strong style={{ color: '#94a3b8' }}>Component Stack:</strong>{'\n'}
              {this.state.info}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
