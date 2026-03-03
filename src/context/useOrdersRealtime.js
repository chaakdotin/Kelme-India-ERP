import { useCallback, useContext, useEffect, useState } from 'react'
import { shopifyOrders } from '../data/mockData'
import RealtimeContextValue from './realtimeContextValue'
import {
  createDemoIncomingOrder,
  sortOrdersByDateDesc,
  toAlert,
} from './realtimeOrderHelpers'

export function useOrdersRealtime() {
  const context = useContext(RealtimeContextValue)
  const [fallbackOrders, setFallbackOrders] = useState(() => sortOrdersByDateDesc(shopifyOrders))
  const [fallbackAlerts, setFallbackAlerts] = useState([])

  const registerFallbackIncomingOrder = useCallback((incomingOrder) => {
    setFallbackOrders((prev) => {
      const withoutDuplicate = prev.filter((order) => order.id !== incomingOrder.id)
      return sortOrdersByDateDesc([incomingOrder, ...withoutDuplicate])
    })

    setFallbackAlerts((prev) => [toAlert(incomingOrder), ...prev].slice(0, 25))
  }, [])

  const simulateFallbackIncomingOrder = useCallback(() => {
    const demoOrder = createDemoIncomingOrder()
    registerFallbackIncomingOrder(demoOrder)
  }, [registerFallbackIncomingOrder])

  const markFallbackAlertsRead = useCallback(() => {
    setFallbackAlerts((prev) => prev.map((alert) => ({ ...alert, unread: false })))
  }, [])

  const dismissFallbackAlert = useCallback((alertId) => {
    setFallbackAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }, [])

  useEffect(() => {
    if (context) return undefined

    const onExternalOrder = (event) => {
      if (event?.detail?.id && event?.detail?.name) {
        registerFallbackIncomingOrder(event.detail)
      }
    }

    const onTestOrderRequest = () => {
      simulateFallbackIncomingOrder()
    }

    window.addEventListener('shopify:new-order', onExternalOrder)
    window.addEventListener('shopify:test-order', onTestOrderRequest)

    return () => {
      window.removeEventListener('shopify:new-order', onExternalOrder)
      window.removeEventListener('shopify:test-order', onTestOrderRequest)
    }
  }, [context, registerFallbackIncomingOrder, simulateFallbackIncomingOrder])

  if (!context) {
    const unreadAlertCount = fallbackAlerts.reduce((count, alert) => (alert.unread ? count + 1 : count), 0)

    return {
      orders: fallbackOrders,
      alerts: fallbackAlerts,
      unreadAlertCount,
      isRealtimeConnected: false,
      registerIncomingOrder: registerFallbackIncomingOrder,
      simulateIncomingOrder: simulateFallbackIncomingOrder,
      markAllAlertsRead: markFallbackAlertsRead,
      dismissAlert: dismissFallbackAlert,
    }
  }

  return {
    ...context,
    isRealtimeConnected: context.isRealtimeConnected ?? true,
  }
}
