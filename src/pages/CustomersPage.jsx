import { useMemo, useState } from 'react'
import StatusPill from '../components/StatusPill'
import {
  compactCurrencyFormatter,
  formatDateTime,
  numberFormatter,
  shopifyCustomers,
} from '../data/mockData'

function CustomersPage() {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [marketingFilter, setMarketingFilter] = useState('All')

  const stateOptions = useMemo(() => ['All', ...new Set(shopifyCustomers.map((customer) => customer.state))], [])

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return shopifyCustomers.filter((customer) => {
      const stateMatch = stateFilter === 'All' || customer.state === stateFilter
      const marketingMatch =
        marketingFilter === 'All' ||
        (marketingFilter === 'Accepts Marketing' && customer.accepts_marketing) ||
        (marketingFilter === 'No Marketing' && !customer.accepts_marketing)

      const queryMatch =
        q.length === 0 ||
        customer.id.toLowerCase().includes(q) ||
        `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        customer.default_address.city.toLowerCase().includes(q) ||
        customer.default_address.country.toLowerCase().includes(q)

      return stateMatch && marketingMatch && queryMatch
    })
  }, [search, stateFilter, marketingFilter])

  const summary = useMemo(() => {
    const total = filteredCustomers.length
    const enabled = filteredCustomers.filter((customer) => customer.state === 'enabled').length
    const acceptsMarketing = filteredCustomers.filter((customer) => customer.accepts_marketing).length
    const totalSpent = filteredCustomers.reduce((sum, customer) => sum + customer.total_spent, 0)
    const totalOrders = filteredCustomers.reduce((sum, customer) => sum + customer.orders_count, 0)
    const avgOrders = total > 0 ? totalOrders / total : 0

    return {
      total,
      enabled,
      acceptsMarketing,
      totalSpent,
      avgOrders,
    }
  }, [filteredCustomers])

  return (
    <section className="page-wrap neo-page-wrap">
      <div className="neo-page-hero">
        <div className="page-heading">
          <div>
            <h1>Customers Analysis</h1>
            <p>Columns mapped to Shopify Customer fields (`orders_count`, `total_spent`, `state`, `accepts_marketing`, address).</p>
          </div>
        </div>
        <div className="neo-page-chip-row">
          <span className="neo-page-chip">LTV Monitor</span>
          <span className="neo-page-chip">Retention Signals</span>
          <span className="neo-page-chip">Marketing Consent</span>
        </div>
      </div>

      <section className="stats-grid mini">
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Customers</p>
          <h2 className="stat-value">{numberFormatter.format(summary.total)}</h2>
          <p className="stat-note">filtered list</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Enabled Accounts</p>
          <h2 className="stat-value">{numberFormatter.format(summary.enabled)}</h2>
          <p className="stat-note">state = enabled</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Marketing Opt-In</p>
          <h2 className="stat-value">{numberFormatter.format(summary.acceptsMarketing)}</h2>
          <p className="stat-note">accepts_marketing = true</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Total Spent</p>
          <h2 className="stat-value">{compactCurrencyFormatter.format(summary.totalSpent)}</h2>
          <p className="stat-note">sum customer.total_spent</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Avg Orders / Customer</p>
          <h2 className="stat-value">{summary.avgOrders.toFixed(1)}</h2>
          <p className="stat-note">average orders_count</p>
        </article>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="search-input"
          placeholder="Search by customer name, email, city, country"
        />
        <div className="filter-row">
          <label className="filter-block">
            <span>State</span>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="filter-select">
              {stateOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-block">
            <span>Marketing</span>
            <select
              value={marketingFilter}
              onChange={(event) => setMarketingFilter(event.target.value)}
              className="filter-select"
            >
              <option>All</option>
              <option>Accepts Marketing</option>
              <option>No Marketing</option>
            </select>
          </label>
        </div>
      </section>

      <article className="panel neo-glass-panel">
        <div className="table-wrap">
          <table className="data-table neo-data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Created At</th>
                <th>City / Country</th>
                <th>Orders Count</th>
                <th>Total Spent</th>
                <th>Marketing</th>
                <th>State</th>
                <th>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="mono">{customer.id.split('/').pop()}</td>
                  <td>{`${customer.first_name} ${customer.last_name}`}</td>
                  <td>{customer.email}</td>
                  <td>{formatDateTime(customer.created_at)}</td>
                  <td>{`${customer.default_address.city}, ${customer.default_address.country}`}</td>
                  <td>{customer.orders_count}</td>
                  <td>{compactCurrencyFormatter.format(customer.total_spent)}</td>
                  <td>
                    <StatusPill status={customer.accepts_marketing ? 'subscribed' : 'not_subscribed'} />
                  </td>
                  <td>
                    <StatusPill status={customer.state} />
                  </td>
                  <td>{customer.last_order_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && <p className="empty-state">No Shopify customers match current filters.</p>}
        </div>
      </article>
    </section>
  )
}

export default CustomersPage
