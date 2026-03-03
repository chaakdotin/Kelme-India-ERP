import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { clearAuthSession, loadAuthSession } from './auth/otpAuth'
import './App.css'
import EmailOtpAuth from './components/EmailOtpAuth'
import OrdersRealtimeProvider from './context/OrdersRealtimeProvider'
import { useOrdersRealtime } from './context/useOrdersRealtime'
import { currencyFormatter } from './data/mockData'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  { to: '/customers', label: 'Customers' },
]

function App() {
  const [authSession, setAuthSession] = useState(() => loadAuthSession())

  const verifiedAt = useMemo(() => {
    if (!authSession?.verifiedAt) return ''

    return new Date(authSession.verifiedAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [authSession])

  const handleLogout = () => {
    clearAuthSession()
    setAuthSession(null)
  }

  if (!authSession) {
    return (
      <main className="erp-shell auth-shell">
        <div className="bg-orb orb-a" />
        <div className="bg-orb orb-b" />
        <EmailOtpAuth onAuthenticated={setAuthSession} />
      </main>
    )
  }

  return (
    <OrdersRealtimeProvider>
      <AuthenticatedShell authSession={authSession} verifiedAt={verifiedAt} onLogout={handleLogout} />
    </OrdersRealtimeProvider>
  )
}

function AuthenticatedShell({ authSession, verifiedAt, onLogout }) {
  const { alerts, unreadAlertCount, markAllAlertsRead, dismissAlert, simulateIncomingOrder, isRealtimeConnected } = useOrdersRealtime()
  const latestAlerts = alerts.slice(0, 3)
  const [testOrderMessageAt, setTestOrderMessageAt] = useState(null)

  useEffect(() => {
    if (!testOrderMessageAt) return undefined

    const timeoutId = window.setTimeout(() => {
      setTestOrderMessageAt(null)
    }, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [testOrderMessageAt])

  const handleTestOrder = () => {
    simulateIncomingOrder()
    setTestOrderMessageAt(Date.now())
  }

  return (
    <main className="erp-shell">
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />

      <header className="shell-header">
        <div>
          <p className="eyebrow">Kelme India ERP</p>
          <h1 className="title">Shopify Commerce Intelligence</h1>
          <p className="header-note">Only Shopify-available columns are used across all pages.</p>
        </div>

        <div className="header-right">
          <div className="shell-actions">
            <span className={`live-sync-pill ${isRealtimeConnected ? 'online' : 'offline'}`}>
              <span className="live-sync-dot" />
              {isRealtimeConnected ? 'Live Sync' : 'Sync Recovery'}
            </span>
            <span className="session-email" title={authSession.email}>
              {authSession.email}
            </span>
            <button
              type="button"
              className={`alert-btn ${unreadAlertCount > 0 ? 'has-unread' : ''}`}
              onClick={markAllAlertsRead}
              title="Mark all order alerts as read"
            >
              Alerts
              {unreadAlertCount > 0 && <span className="alert-count">{unreadAlertCount}</span>}
            </button>
            <button type="button" className="test-order-btn" onClick={handleTestOrder}>
              + Test Order
            </button>
            {testOrderMessageAt && <span className="test-order-feedback">Test order added</span>}
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
          <p className="verify-meta">Verified via OTP: {verifiedAt}</p>
          <nav className="shell-nav" aria-label="Main">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {latestAlerts.length > 0 && (
        <section className="toast-stack" aria-live="polite" aria-label="Order alerts">
          {latestAlerts.map((alert) => (
            <article key={alert.id} className={`order-toast ${alert.unread ? 'new' : ''}`}>
              <p className="toast-title">New Order {alert.orderName}</p>
              <p className="toast-subline">{alert.customerEmail}</p>
              <div className="toast-meta">
                <span>{currencyFormatter.format(alert.totalPrice)}</span>
                <button type="button" className="toast-dismiss" onClick={() => dismissAlert(alert.id)}>
                  Dismiss
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default App
