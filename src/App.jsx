import './App.css'

const keyMetrics = [
  { label: 'Net Sales', value: 12450000, change: '+18.4%', tone: 'up' },
  { label: 'Orders Processed', value: 3120, change: '+9.1%', tone: 'up' },
  { label: 'Avg. Order Value', value: 3990, change: '+6.3%', tone: 'up' },
  { label: 'Return Rate', value: '2.8%', change: '-0.7%', tone: 'down' },
]

const monthlySales = [
  { month: 'Oct', value: 1480000 },
  { month: 'Nov', value: 1650000 },
  { month: 'Dec', value: 2140000 },
  { month: 'Jan', value: 1980000 },
  { month: 'Feb', value: 2310000 },
  { month: 'Mar', value: 2890000 },
]

const channelPerformance = [
  { channel: 'Marketplace', share: 38, sales: 4731000 },
  { channel: 'Retail Stores', share: 27, sales: 3361000 },
  { channel: 'D2C Website', share: 22, sales: 2739000 },
  { channel: 'B2B Accounts', share: 13, sales: 1619000 },
]

const topProducts = [
  { name: 'Blaze Pro Football Shoe', units: 1240, sales: 2878000 },
  { name: 'AeroStrike Jersey', units: 1935, sales: 2495000 },
  { name: 'Pivot Training Shorts', units: 2050, sales: 1842000 },
  { name: 'Keeper Grip Gloves', units: 910, sales: 1189000 },
]

const regionPerformance = [
  { region: 'North India', growth: 21, sales: 4015000 },
  { region: 'West India', growth: 17, sales: 3184000 },
  { region: 'South India', growth: 12, sales: 2877000 },
  { region: 'East India', growth: 9, sales: 1374000 },
]

const inventoryAlerts = [
  { sku: 'SH-BLAZE-08', message: 'Blaze Pro UK-8 stock below reorder point', severity: 'high' },
  { sku: 'JR-AERO-XL', message: 'AeroStrike XL selling 2.3x faster this week', severity: 'medium' },
  { sku: 'GL-KEEP-09', message: 'Incoming PO delayed by 2 days', severity: 'low' },
]

const recentOrders = [
  { id: 'ORD-4192', customer: 'KickKart Sports', channel: 'B2B', amount: 145000, status: 'Packed' },
  { id: 'ORD-4191', customer: 'Ritika Sharma', channel: 'D2C', amount: 4990, status: 'Dispatched' },
  { id: 'ORD-4187', customer: 'Urban Goal Store', channel: 'Marketplace', amount: 38990, status: 'Processing' },
  { id: 'ORD-4183', customer: 'Delhi United Club', channel: 'Retail', amount: 96100, status: 'Delayed' },
]

const compactCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
})

const fullCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function App() {
  const maxSalesValue = Math.max(...monthlySales.map((point) => point.value))
  const updatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <main className="dashboard-page">
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      <header className="hero">
        <div>
          <p className="eyebrow">Kelme India ERP</p>
          <h1>Brand Sales Dashboard</h1>
          <p className="subcopy">
            Sales, order flow, category performance, stock risks, and regional growth in one view.
          </p>
        </div>
        <div className="hero-meta">
          <p>Updated: {updatedDate}</p>
          <span className="live-dot">Live Sync</span>
        </div>
      </header>

      <section className="metrics-grid">
        {keyMetrics.map((metric, index) => (
          <article className="metric-card" key={metric.label} style={{ '--delay': `${index * 80}ms` }}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">
              {typeof metric.value === 'number'
                ? metric.label.includes('Orders')
                  ? metric.value.toLocaleString('en-IN')
                  : compactCurrency.format(metric.value)
                : metric.value}
            </p>
            <p className={`metric-change ${metric.tone}`}>
              {metric.tone === 'up' ? 'Up' : 'Down'} {metric.change} vs last month
            </p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel panel-wide" style={{ '--delay': '120ms' }}>
          <div className="panel-head">
            <h2>Monthly Sales Trend</h2>
            <p>Oct 2025 - Mar 2026</p>
          </div>
          <div className="sales-chart">
            {monthlySales.map((point, index) => (
              <div className="bar-wrap" key={point.month}>
                <div
                  className="bar"
                  style={{
                    '--height': `${(point.value / maxSalesValue) * 100}%`,
                    '--delay': `${220 + index * 90}ms`,
                  }}
                />
                <p className="bar-value">{compactCurrency.format(point.value)}</p>
                <p className="bar-label">{point.month}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half" style={{ '--delay': '200ms' }}>
          <div className="panel-head">
            <h2>Channel Mix</h2>
            <p>Contribution by source</p>
          </div>
          <div className="channel-list">
            {channelPerformance.map((item) => (
              <div key={item.channel} className="channel-row">
                <div className="channel-line">
                  <p>{item.channel}</p>
                  <p>{item.share}%</p>
                </div>
                <div className="track">
                  <div className="fill" style={{ width: `${item.share}%` }} />
                </div>
                <p className="row-value">{fullCurrency.format(item.sales)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half" style={{ '--delay': '260ms' }}>
          <div className="panel-head">
            <h2>Regional Growth</h2>
            <p>State cluster performance</p>
          </div>
          <div className="region-list">
            {regionPerformance.map((region) => (
              <div key={region.region} className="region-row">
                <div>
                  <p className="region-name">{region.region}</p>
                  <p className="row-value">{fullCurrency.format(region.sales)}</p>
                </div>
                <span className="growth-chip">+{region.growth}%</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-half" style={{ '--delay': '320ms' }}>
          <div className="panel-head">
            <h2>Top Selling Products</h2>
            <p>By revenue</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.name}>
                    <td>{product.name}</td>
                    <td>{product.units.toLocaleString('en-IN')}</td>
                    <td>{fullCurrency.format(product.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel panel-half" style={{ '--delay': '380ms' }}>
          <div className="panel-head">
            <h2>Inventory Alerts</h2>
            <p>Immediate action queue</p>
          </div>
          <div className="alert-list">
            {inventoryAlerts.map((alert) => (
              <div key={alert.sku} className="alert-item">
                <span className={`alert-dot ${alert.severity}`} />
                <div>
                  <p className="alert-message">{alert.message}</p>
                  <p className="alert-sku">{alert.sku}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-wide" style={{ '--delay': '420ms' }}>
          <div className="panel-head">
            <h2>Recent Orders</h2>
            <p>Live order movement</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.channel}</td>
                    <td>{fullCurrency.format(order.amount)}</td>
                    <td>
                      <span className={`status-pill ${order.status.toLowerCase()}`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
