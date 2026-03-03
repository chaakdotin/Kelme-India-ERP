import { useMemo, useState } from 'react'
import StatusPill from '../components/StatusPill'
import { useOrdersRealtime } from '../context/useOrdersRealtime'
import {
  currencyFormatter,
  formatDateTime,
  getOrderNet,
  getOrderQuantity,
  numberFormatter,
} from '../data/mockData'

function OrdersPage() {
  const { orders } = useOrdersRealtime()
  const [search, setSearch] = useState('')
  const [financialStatus, setFinancialStatus] = useState('All')
  const [fulfillmentStatus, setFulfillmentStatus] = useState('All')
  const [sourceName, setSourceName] = useState('All')
  const [customerFrequency, setCustomerFrequency] = useState('All')

  const customerOrderCountMap = useMemo(() => {
    return orders.reduce((acc, order) => {
      const key = order.customer.id
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const financialOptions = useMemo(() => ['All', ...new Set(orders.map((order) => order.financial_status))], [orders])
  const fulfillmentOptions = useMemo(() => ['All', ...new Set(orders.map((order) => order.fulfillment_status))], [orders])
  const sourceOptions = useMemo(() => ['All', ...new Set(orders.map((order) => order.source_name))], [orders])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()

    return orders.filter((order) => {
      const financialMatch = financialStatus === 'All' || order.financial_status === financialStatus
      const fulfillmentMatch = fulfillmentStatus === 'All' || order.fulfillment_status === fulfillmentStatus
      const sourceMatch = sourceName === 'All' || order.source_name === sourceName
      const customerOrders = customerOrderCountMap[order.customer.id] ?? 1
      const frequencyMatch =
        customerFrequency === 'All' ||
        (customerFrequency === 'Repeat (2+)' && customerOrders > 1) ||
        (customerFrequency === 'Single (1)' && customerOrders === 1)

      const queryMatch =
        q.length === 0 ||
        order.name.toLowerCase().includes(q) ||
        order.customer.email.toLowerCase().includes(q) ||
        `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(q) ||
        order.shipping_address.city.toLowerCase().includes(q) ||
        order.line_items.some((item) => item.title.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))

      return financialMatch && fulfillmentMatch && sourceMatch && frequencyMatch && queryMatch
    })
  }, [orders, search, financialStatus, fulfillmentStatus, sourceName, customerFrequency, customerOrderCountMap])

  const summary = useMemo(() => {
    const gross = filteredOrders.reduce((sum, order) => sum + order.subtotal_price + order.total_tax, 0)
    const discounts = filteredOrders.reduce((sum, order) => sum + order.total_discounts, 0)
    const refunds = filteredOrders.reduce((sum, order) => sum + order.total_refunded, 0)
    const net = filteredOrders.reduce((sum, order) => sum + getOrderNet(order), 0)
    const repeatCustomers = new Set(filteredOrders.filter((order) => (customerOrderCountMap[order.customer.id] ?? 1) > 1).map((order) => order.customer.id))

    return {
      orders: filteredOrders.length,
      gross,
      discounts,
      refunds,
      net,
      repeatCustomers: repeatCustomers.size,
    }
  }, [filteredOrders, customerOrderCountMap])

  const repeatCustomerRows = useMemo(() => {
    const grouped = filteredOrders.reduce((acc, order) => {
      const key = order.customer.id
      if (!acc[key]) {
        acc[key] = {
          customerId: order.customer.id,
          customerName: `${order.customer.first_name} ${order.customer.last_name}`,
          email: order.customer.email,
          ordersCount: 0,
          netSales: 0,
          lastOrderAt: order.created_at,
        }
      }

      acc[key].ordersCount += 1
      acc[key].netSales += getOrderNet(order)
      if (new Date(order.created_at).getTime() > new Date(acc[key].lastOrderAt).getTime()) {
        acc[key].lastOrderAt = order.created_at
      }

      return acc
    }, {})

    return Object.values(grouped)
      .filter((row) => row.ordersCount > 1)
      .sort((a, b) => b.ordersCount - a.ordersCount)
  }, [filteredOrders])

  return (
    <section className="page-wrap neo-page-wrap">
      <div className="neo-page-hero">
        <div className="page-heading">
          <div>
            <h1>Orders Analysis</h1>
            <p>Columns aligned with Shopify Order fields: `name`, `created_at`, `financial_status`, `fulfillment_status`, totals.</p>
          </div>
        </div>
        <div className="neo-page-chip-row">
          <span className="neo-page-chip">Realtime Orders Feed</span>
          <span className="neo-page-chip">Repeat Customer Lens</span>
          <span className="neo-page-chip">Fraud & Fulfillment View</span>
        </div>
      </div>

      <section className="stats-grid mini">
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Orders</p>
          <h2 className="stat-value">{numberFormatter.format(summary.orders)}</h2>
          <p className="stat-note">filtered records</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Gross Sales</p>
          <h2 className="stat-value">{currencyFormatter.format(summary.gross)}</h2>
          <p className="stat-note">subtotal + tax</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Discounts</p>
          <h2 className="stat-value">{currencyFormatter.format(summary.discounts)}</h2>
          <p className="stat-note">orders.total_discounts</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Refunded</p>
          <h2 className="stat-value">{currencyFormatter.format(summary.refunds)}</h2>
          <p className="stat-note">orders.total_refunded</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Net Sales</p>
          <h2 className="stat-value">{currencyFormatter.format(summary.net)}</h2>
          <p className="stat-note">total - refunded</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Repeat Customers</p>
          <h2 className="stat-value">{numberFormatter.format(summary.repeatCustomers)}</h2>
          <p className="stat-note">customers with 2+ orders</p>
        </article>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="search-input"
          placeholder="Search by order #, customer, city, product title, SKU"
        />
        <div className="filter-row">
          <label className="filter-block">
            <span>Financial Status</span>
            <select value={financialStatus} onChange={(event) => setFinancialStatus(event.target.value)} className="filter-select">
              {financialOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-block">
            <span>Fulfillment Status</span>
            <select value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)} className="filter-select">
              {fulfillmentOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-block">
            <span>Source</span>
            <select value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="filter-select">
              {sourceOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-block">
            <span>Customer Orders</span>
            <select value={customerFrequency} onChange={(event) => setCustomerFrequency(event.target.value)} className="filter-select">
              <option>All</option>
              <option>Repeat (2+)</option>
              <option>Single (1)</option>
            </select>
          </label>
        </div>
      </section>

      <article className="panel neo-glass-panel">
        <div className="table-wrap">
          <table className="data-table neo-data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Created At</th>
                <th>Customer</th>
                <th>Customer Orders</th>
                <th>Source</th>
                <th>Items Qty</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Financial</th>
                <th>Fulfillment</th>
                <th>Ship Country</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="mono">{order.name}</td>
                  <td>{formatDateTime(order.created_at)}</td>
                  <td>
                    <p className="line">{`${order.customer.first_name} ${order.customer.last_name}`}</p>
                    <p className="subline">{order.customer.email}</p>
                  </td>
                  <td>
                    <span className="orders-count-badge">{customerOrderCountMap[order.customer.id] ?? 1}</span>
                  </td>
                  <td>{order.source_name}</td>
                  <td>{getOrderQuantity(order)}</td>
                  <td>{currencyFormatter.format(order.subtotal_price)}</td>
                  <td>{currencyFormatter.format(order.total_discounts)}</td>
                  <td>{currencyFormatter.format(order.total_tax)}</td>
                  <td>{currencyFormatter.format(order.total_price)}</td>
                  <td>
                    <StatusPill status={order.financial_status} />
                  </td>
                  <td>
                    <StatusPill status={order.fulfillment_status} />
                  </td>
                  <td>{order.shipping_address.country_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && <p className="empty-state">No Shopify orders match current filters.</p>}
        </div>
      </article>

      <article className="panel neo-glass-panel">
        <div className="panel-head">
          <h3>Customers with Multiple Orders</h3>
          <p className="stat-note">Based on currently filtered orders</p>
        </div>
        <div className="table-wrap">
          <table className="data-table compact neo-data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Orders Count</th>
                <th>Net Sales</th>
                <th>Last Order At</th>
              </tr>
            </thead>
            <tbody>
              {repeatCustomerRows.map((row) => (
                <tr key={row.customerId}>
                  <td>
                    <p className="line">{row.customerName}</p>
                    <p className="subline">{row.email}</p>
                  </td>
                  <td>{row.ordersCount}</td>
                  <td>{currencyFormatter.format(row.netSales)}</td>
                  <td>{formatDateTime(row.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {repeatCustomerRows.length === 0 && <p className="empty-state">No repeat customers in current filter.</p>}
        </div>
      </article>
    </section>
  )
}

export default OrdersPage
