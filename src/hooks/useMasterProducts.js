// src/hooks/useMasterProducts.js
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

export default function useMasterProducts() {
  return useQuery({
    queryKey: ["master-products"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/products") // or your master-products endpoint
      return Array.isArray(data) ? data : data.items
    },
    staleTime: 1000 * 60 * 5,
  })
}
