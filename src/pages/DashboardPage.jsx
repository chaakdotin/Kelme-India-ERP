import { useMemo } from 'react'
import StatusPill from '../components/StatusPill'
import { useOrdersRealtime } from '../context/useOrdersRealtime'
import {
  compactCurrencyFormatter,
  currencyFormatter,
  formatDateTime,
  getOrderNet,
  getOrderQuantity,
  numberFormatter,
  shopifyCustomers,
} from '../data/mockData'

const sidebarSections = [
  { label: 'Control Room', active: true },
  { label: 'Revenue Map' },
  { label: 'Orders Pulse' },
  { label: 'Customer Radar' },
  { label: 'Reports' },
]

function DashboardPage() {
  const { orders, alerts, unreadAlertCount, markAllAlertsRead } = useOrdersRealtime()

  const summary = useMemo(() => {
    const totalOrders = orders.length
    const grossSales = orders.reduce((sum, order) => sum + order.subtotal_price + order.total_tax, 0)
    const discounts = orders.reduce((sum, order) => sum + order.total_discounts, 0)
    const netSales = orders.reduce((sum, order) => sum + getOrderNet(order), 0)
    const aov = totalOrders > 0 ? netSales / totalOrders : 0

    return {
      totalOrders,
      grossSales,
      discounts,
      netSales,
      aov,
      roi: discounts > 0 ? ((netSales / discounts) * 100).toFixed(0) : '0',
    }
  }, [orders])

  const sourceMix = useMemo(() => {
    const sourceMap = orders.reduce((acc, order) => {
      const key = order.source_name
      if (!acc[key]) {
        acc[key] = { source: key, orders: 0, sales: 0 }
      }

      acc[key].orders += 1
      acc[key].sales += getOrderNet(order)
      return acc
    }, {})

    return Object.values(sourceMap).sort((a, b) => b.sales - a.sales)
  }, [orders])

  const topProducts = useMemo(() => {
    const productMap = orders.reduce((acc, order) => {
      order.line_items.forEach((item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = { id: item.product_id, title: item.title, units: 0, revenue: 0 }
        }

        acc[item.product_id].units += item.quantity
        acc[item.product_id].revenue += item.quantity * item.price
      })

      return acc
    }, {})

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)
  }, [orders])

  const opportunities = useMemo(() => {
    return [...shopifyCustomers]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 6)
      .map((customer) => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        region: customer.default_address.province,
        score: Math.min(98, 62 + customer.orders_count * 7),
        leadIncrease: customer.orders_count * 1700,
        accountValue: customer.total_spent,
        risk: customer.orders_count >= 3 ? 'low' : customer.orders_count === 2 ? 'pending' : 'critical',
      }))
  }, [])

  const donut = useMemo(() => {
    const total = sourceMix.reduce((sum, row) => sum + row.sales, 0)
    if (total === 0) {
      return {
        background: 'conic-gradient(#dde4ed 0deg 360deg)',
        slices: [],
      }
    }

    const colors = ['#c8ff69', '#6b63ff', '#59ddff', '#f6d783']
    let cursor = 0

    const slices = sourceMix.slice(0, 4).map((row, index) => {
      const ratio = row.sales / total
      const size = ratio * 360
      const start = cursor
      const end = cursor + size
      cursor = end

      return {
        source: row.source,
        orders: row.orders,
        sales: row.sales,
        percentage: (ratio * 100).toFixed(1),
        color: colors[index],
        segment: `${colors[index]} ${start}deg ${end}deg`,
      }
    })

    if (cursor < 360) {
      slices.push({
        source: 'Other',
        orders: 0,
        sales: 0,
        percentage: '0.0',
        color: '#eef2f9',
        segment: `#eef2f9 ${cursor}deg 360deg`,
      })
    }

    return {
      background: `conic-gradient(${slices.map((slice) => slice.segment).join(', ')})`,
      slices: slices.slice(0, 4),
    }
  }, [sourceMix])

  const metricTiles = [
    {
      label: 'Total Income',
      value: compactCurrencyFormatter.format(summary.netSales),
      note: 'orders.total_price - orders.total_refunded',
    },
    {
      label: 'ROI Proxy',
      value: `${summary.roi}%`,
      note: 'net sales / discounts',
    },
    {
      label: 'Daily Active Orders',
      value: numberFormatter.format(summary.totalOrders),
      note: 'orders in current feed',
    },
  ]

  return (
    <section className="neo-dashboard-wrap">
      <div className="neo-dashboard-frame">
        <aside className="neo-sidebar">
          <div className="neo-logo">
            <span className="neo-logo-mark" />
            <span>Kelme Pulse OS</span>
          </div>

          <nav className="neo-menu" aria-label="Board sections">
            {sidebarSections.map((item) => (
              <button key={item.label} type="button" className={`neo-menu-item ${item.active ? 'active' : ''}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="neo-content">
          <div className="neo-toolbar">
            <div className="neo-search-pill">Search Shopify fields and KPIs</div>
            <div className="neo-toolbar-right">
              <span className="neo-chip">All channels</span>
              <span className="neo-chip">Today</span>
            </div>
          </div>

          <h1 className="neo-title-xl">Commerce Command Center</h1>

          <section className="neo-hero">
            <div className="neo-hero-head">
              <div>
                <h2>Smart Sales Distribution</h2>
                <p>Unified insights powered by Shopify `orders`, `customers`, and `line_items` fields.</p>
              </div>
              <span className="neo-hero-tag">Realtime Commerce Pulse</span>
            </div>

            <div className="neo-hero-stats">
              {metricTiles.map((tile) => (
                <article className="neo-hero-stat" key={tile.label}>
                  <p>{tile.label}</p>
                  <h3>{tile.value}</h3>
                  <small>{tile.note}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="neo-main-grid">
            <article className="neo-panel">
              <div className="neo-panel-head">
                <h3>Sales Analysis</h3>
                <p>By `source_name`</p>
              </div>

              <div className="neo-donut-wrap">
                <div className="neo-donut" style={{ background: donut.background }}>
                  <div className="neo-donut-core">
                    <p>Total</p>
                    <strong>{compactCurrencyFormatter.format(summary.grossSales)}</strong>
                  </div>
                </div>

                <div className="neo-legend">
                  {donut.slices.map((slice) => (
                    <div key={slice.source} className="neo-legend-row">
                      <span className="neo-dot" style={{ background: slice.color }} />
                      <p>{slice.source}</p>
                      <span>{slice.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="neo-panel neon-surface">
              <div className="neo-panel-head">
                <h3>Deal Analysis</h3>
                <p>Top `line_items` by revenue</p>
              </div>

              <div className="neo-deal-grid">
                {topProducts.map((product) => (
                  <article className="neo-deal-card" key={product.id}>
                    <p className="deal-name">{product.title}</p>
                    <p className="deal-value">{currencyFormatter.format(product.revenue)}</p>
                    <p className="deal-subline">{numberFormatter.format(product.units)} units sold</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="neo-assistant-card">
              <p className="assistant-title">Ops Assistant</p>
              <div className="assistant-orb" />
              <p className="assistant-copy">
                {orders.length > 0
                  ? `Latest: ${orders[0].name} | ${formatDateTime(orders[0].created_at)}`
                  : 'No orders yet'}
              </p>
              <div className="assistant-buttons">
                <span className="assistant-btn">Pro Analysis</span>
                <span className="assistant-btn">Report</span>
              </div>
              <button type="button" className="assistant-alert-btn" onClick={markAllAlertsRead}>
                Mark Alerts Read ({unreadAlertCount})
              </button>
            </article>
          </section>

          <section className="neo-bottom-grid">
            <article className="neo-panel neo-table-panel">
              <div className="neo-panel-head">
                <h3>Top Opportunities</h3>
                <p>customers.total_spent + orders_count</p>
              </div>
              <div className="table-wrap">
                <table className="data-table compact neo-data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Region</th>
                      <th>AI Success Score</th>
                      <th>Risk Level</th>
                      <th>Lead Increase</th>
                      <th>Account Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.region}</td>
                        <td>{row.score}%</td>
                        <td>
                          <StatusPill status={row.risk} />
                        </td>
                        <td>+{numberFormatter.format(row.leadIncrease)}</td>
                        <td>{currencyFormatter.format(row.accountValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="neo-panel">
              <div className="neo-panel-head">
                <h3>Recent Orders</h3>
                <p>Shopify `orders` feed</p>
              </div>
              <div className="table-wrap">
                <table className="data-table compact neo-data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td className="mono">{order.name}</td>
                        <td>{order.customer.email}</td>
                        <td>{getOrderQuantity(order)}</td>
                        <td>{currencyFormatter.format(order.total_price)}</td>
                        <td>
                          <StatusPill status={order.financial_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && <p className="empty-state">No Shopify orders found.</p>}
              </div>
            </article>

            <article className="neo-panel">
              <div className="neo-panel-head">
                <h3>New Order Alerts</h3>
                <p>Realtime `shopify:new-order` events</p>
              </div>
              {alerts.length === 0 ? (
                <p className="empty-state">No new order alerts yet.</p>
              ) : (
                <div className="alert-feed">
                  {alerts.slice(0, 5).map((alert) => (
                    <article key={alert.id} className={`alert-row ${alert.unread ? 'unread' : ''}`}>
                      <p className="alert-title">{alert.orderName}</p>
                      <p className="alert-subline">{alert.customerEmail}</p>
                      <p className="alert-subline">
                        {currencyFormatter.format(alert.totalPrice)} | {formatDateTime(alert.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
