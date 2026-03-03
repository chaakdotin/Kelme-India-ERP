import { shopifyOrders } from '../data/mockData'

export const sortOrdersByDateDesc = (orders) => {
  return [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export const parseOrderNumber = (name) => {
  const match = String(name).match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

export const toAlert = (order) => ({
  id: `alert-${order.id}-${Date.now()}`,
  orderId: order.id,
  orderName: order.name,
  customerEmail: order.customer?.email ?? 'unknown@customer.com',
  totalPrice: order.total_price ?? 0,
  createdAt: new Date().toISOString(),
  unread: true,
})

const randomFrom = (list) => {
  if (list.length === 0) return undefined
  return list[Math.floor(Math.random() * list.length)]
}

const fallbackCustomer = {
  id: 'gid://shopify/Customer/8999',
  first_name: 'Walk-in',
  last_name: 'Customer',
  email: 'walkin@customer.in',
}

const fallbackAddress = {
  city: 'New Delhi',
  country: 'India',
  country_code: 'IN',
}

const fallbackLineItem = {
  product_id: 'gid://shopify/Product/9101',
  title: 'Blaze Pro Football Shoe',
  sku: 'BLZ-PRO-UK8',
  quantity: 1,
  price: 7490,
}

const customerPool = Array.from(new Map(shopifyOrders.map((order) => [order.customer.id, order.customer])).values())
const lineItemPool = shopifyOrders.flatMap((order) => order.line_items)
const shippingPool = shopifyOrders.map((order) => order.shipping_address)

let orderNumberCursor = shopifyOrders.reduce((max, order) => {
  return Math.max(max, parseOrderNumber(order.name))
}, 5000)

const getNextOrderNumber = () => {
  orderNumberCursor += 1
  return orderNumberCursor
}

export const createDemoIncomingOrder = () => {
  const orderNumber = getNextOrderNumber()
  const pickedCustomer = randomFrom(customerPool) ?? fallbackCustomer
  const sourceName = randomFrom(['web', 'shop_app', 'pos']) ?? 'web'
  const selectedLineItems = Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => {
    const pickedItem = randomFrom(lineItemPool) ?? fallbackLineItem
    const quantity = Math.floor(Math.random() * 2) + 1
    return {
      product_id: pickedItem.product_id,
      title: pickedItem.title,
      sku: pickedItem.sku,
      quantity,
      price: pickedItem.price,
    }
  })

  const subtotal = selectedLineItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const discount = randomFrom([0, 500, 800, 1200]) ?? 0
  const taxable = Math.max(subtotal - discount, 0)
  const tax = Math.round(taxable * 0.18)

  return {
    id: `gid://shopify/Order/${orderNumber}`,
    name: `#${orderNumber}`,
    created_at: new Date().toISOString(),
    source_name: sourceName,
    currency: 'INR',
    subtotal_price: subtotal,
    total_tax: tax,
    total_discounts: discount,
    total_price: taxable + tax,
    total_refunded: 0,
    financial_status: randomFrom(['paid', 'authorized', 'pending']) ?? 'pending',
    fulfillment_status: randomFrom(['unfulfilled', 'fulfilled', 'partial']) ?? 'unfulfilled',
    customer: pickedCustomer,
    shipping_address: randomFrom(shippingPool) ?? fallbackAddress,
    line_items: selectedLineItems,
  }
}
