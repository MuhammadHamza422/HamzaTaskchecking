// src/hooks/useExternalOrders.js
import { useQuery } from "@tanstack/react-query"
import { fetchExternalOrders } from "../api/external"

export default function useExternalOrders(params) {
  return useQuery({
    queryKey: ["external-orders", params],
    queryFn: async () => {
      const orders = await fetchExternalOrders(params)
      if (!orders) {
        throw new Error("No orders returned")
      }
      return orders
    },
    staleTime: 1000 * 60 * 5, // 5m
  })
}
