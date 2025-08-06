// src/api/external.js
import apiClient from "./client"

/**
 * Fetch all external orders, optionally filtering by source.
 */
export async function fetchExternalOrders({ source } = {}) {
  const resp = await apiClient.get("/external/orders", {
    // if `source` is undefined, we pass an empty params object
    params: source ? { source } : {},
  })

  // backend returns either an array or { orders: [...] }
  if (Array.isArray(resp.data)) {
    return resp.data
  } else if (resp.data.orders) {
    return resp.data.orders
  }

  // if we got here, something unexpected – throw so React-Query knows
  throw new Error("Unexpected response shape from /external/orders")
}

/**
 * Update an order's line→master mappings.
 */
export async function updateOrderLines(extId, mappings) {
  const resp = await apiClient.put(
    `/external/orders/${extId}/lines`,
    { mappings }
  )
  return resp.data
}
