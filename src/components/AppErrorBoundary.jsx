import { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected runtime error',
    }
  }

  componentDidCatch(error) {
    console.error('AppErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="erp-shell auth-shell">
          <section className="auth-wrap">
            <article className="auth-card">
              <p className="eyebrow">Runtime Error</p>
              <h1 className="auth-title">App failed to render</h1>
              <p className="auth-subtitle">{this.state.message}</p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  localStorage.removeItem('kelme_erp_auth_session')
                  sessionStorage.removeItem('kelme_erp_otp_challenge')
                  window.location.reload()
                }}
              >
                Reset Session & Reload
              </button>
            </article>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
