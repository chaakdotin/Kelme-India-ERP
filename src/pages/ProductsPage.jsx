import { useMemo, useState } from 'react'
import StatusPill from '../components/StatusPill'
import {
  currencyFormatter,
  formatDateTime,
  getPriceRange,
  getProductInventory,
  numberFormatter,
  shopifyProducts,
} from '../data/mockData'

function ProductsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [vendor, setVendor] = useState('All')

  const statusOptions = useMemo(() => ['All', ...new Set(shopifyProducts.map((product) => product.status))], [])
  const vendorOptions = useMemo(() => ['All', ...new Set(shopifyProducts.map((product) => product.vendor))], [])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()

    return shopifyProducts.filter((product) => {
      const statusMatch = status === 'All' || product.status === status
      const vendorMatch = vendor === 'All' || product.vendor === vendor

      const queryMatch =
        q.length === 0 ||
        product.id.toLowerCase().includes(q) ||
        product.title.toLowerCase().includes(q) ||
        product.vendor.toLowerCase().includes(q) ||
        product.product_type.toLowerCase().includes(q) ||
        product.variants.some((variant) => variant.sku.toLowerCase().includes(q))

      return statusMatch && vendorMatch && queryMatch
    })
  }, [search, status, vendor])

  const summary = useMemo(() => {
    const totalVariants = filteredProducts.reduce((sum, product) => sum + product.variants.length, 0)
    const totalInventory = filteredProducts.reduce((sum, product) => sum + getProductInventory(product), 0)
    const activeProducts = filteredProducts.filter((product) => product.status === 'active').length

    return {
      products: filteredProducts.length,
      totalVariants,
      totalInventory,
      activeProducts,
    }
  }, [filteredProducts])

  return (
    <section className="page-wrap neo-page-wrap">
      <div className="neo-page-hero">
        <div className="page-heading">
          <div>
            <h1>Products & Inventory</h1>
            <p>Columns map to Shopify Product + Variant fields (`status`, `vendor`, `variants.price`, `variants.inventory_quantity`).</p>
          </div>
        </div>
        <div className="neo-page-chip-row">
          <span className="neo-page-chip">Inventory Health</span>
          <span className="neo-page-chip">Variant Pricing Matrix</span>
          <span className="neo-page-chip">Vendor Mix</span>
        </div>
      </div>

      <section className="stats-grid mini">
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Products</p>
          <h2 className="stat-value">{numberFormatter.format(summary.products)}</h2>
          <p className="stat-note">filtered products</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Active Products</p>
          <h2 className="stat-value">{numberFormatter.format(summary.activeProducts)}</h2>
          <p className="stat-note">status = active</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Variants</p>
          <h2 className="stat-value">{numberFormatter.format(summary.totalVariants)}</h2>
          <p className="stat-note">sum of variants count</p>
        </article>
        <article className="stat-card neo-stat-card">
          <p className="stat-label">Total Inventory</p>
          <h2 className="stat-value">{numberFormatter.format(summary.totalInventory)}</h2>
          <p className="stat-note">sum variants.inventory_quantity</p>
        </article>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="search-input"
          placeholder="Search by product, SKU, vendor, product type"
        />
        <div className="filter-row">
          <label className="filter-block">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="filter-select">
              {statusOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-block">
            <span>Vendor</span>
            <select value={vendor} onChange={(event) => setVendor(event.target.value)} className="filter-select">
              {vendorOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <article className="panel neo-glass-panel">
        <div className="table-wrap">
          <table className="data-table neo-data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Variants</th>
                <th>Total Inventory</th>
                <th>Price Range</th>
                <th>Published Scope</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const priceRange = getPriceRange(product)

                return (
                  <tr key={product.id}>
                    <td>
                      <p className="line">{product.title}</p>
                      <p className="subline mono">{product.id.split('/').pop()}</p>
                    </td>
                    <td>{product.vendor}</td>
                    <td>{product.product_type}</td>
                    <td>
                      <StatusPill status={product.status} />
                    </td>
                    <td>{product.variants.length}</td>
                    <td>{numberFormatter.format(getProductInventory(product))}</td>
                    <td>
                      {currencyFormatter.format(priceRange.min)} - {currencyFormatter.format(priceRange.max)}
                    </td>
                    <td>{product.published_scope}</td>
                    <td>{formatDateTime(product.updated_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && <p className="empty-state">No Shopify products match current filters.</p>}
        </div>
      </article>
    </section>
  )
}

export default ProductsPage
