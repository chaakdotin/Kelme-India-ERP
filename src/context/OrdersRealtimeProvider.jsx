import { useCallback, useEffect, useMemo, useState } from 'react'
import RealtimeContextValue from './realtimeContextValue'
import { shopifyOrders } from '../data/mockData'
import {
  createDemoIncomingOrder,
  sortOrdersByDateDesc,
  toAlert,
} from './realtimeOrderHelpers'

function OrdersRealtimeProvider({ children }) {
  const [orders, setOrders] = useState(() => sortOrdersByDateDesc(shopifyOrders))
  const [alerts, setAlerts] = useState([])

  const registerIncomingOrder = useCallback((incomingOrder) => {
    setOrders((prev) => {
      const withoutDuplicate = prev.filter((order) => order.id !== incomingOrder.id)
      return sortOrdersByDateDesc([incomingOrder, ...withoutDuplicate])
    })

    setAlerts((prev) => [toAlert(incomingOrder), ...prev].slice(0, 25))
  }, [])

  const simulateIncomingOrder = useCallback(() => {
    const demoOrder = createDemoIncomingOrder()
    registerIncomingOrder(demoOrder)
  }, [registerIncomingOrder])

  useEffect(() => {
    const onExternalOrder = (event) => {
      if (event?.detail?.id && event?.detail?.name) {
        registerIncomingOrder(event.detail)
      }
    }

    window.addEventListener('shopify:new-order', onExternalOrder)
    return () => window.removeEventListener('shopify:new-order', onExternalOrder)
  }, [registerIncomingOrder])

  useEffect(() => {
    const onTestOrderRequest = () => {
      simulateIncomingOrder()
    }

    window.addEventListener('shopify:test-order', onTestOrderRequest)
    return () => window.removeEventListener('shopify:test-order', onTestOrderRequest)
  }, [simulateIncomingOrder])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      simulateIncomingOrder()
    }, 65000)

    return () => window.clearInterval(intervalId)
  }, [simulateIncomingOrder])

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, unread: false })))
  }, [])

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }, [])

  const unreadAlertCount = useMemo(() => {
    return alerts.reduce((count, alert) => (alert.unread ? count + 1 : count), 0)
  }, [alerts])

  const value = useMemo(
    () => ({
      orders,
      alerts,
      unreadAlertCount,
      isRealtimeConnected: true,
      registerIncomingOrder,
      simulateIncomingOrder,
      markAllAlertsRead,
      dismissAlert,
    }),
    [orders, alerts, unreadAlertCount, registerIncomingOrder, simulateIncomingOrder, markAllAlertsRead, dismissAlert],
  )

  return <RealtimeContextValue.Provider value={value}>{children}</RealtimeContextValue.Provider>
}

export default OrdersRealtimeProvider
