import { useState, useMemo, useRef, useCallback } from "react";
import { debounce } from "lodash";
import apiClient from "../../../api/client";

// util: safely get array from different shapes
const extractList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalize = (p) => ({
  id: p?._id || p?.id,
  product_name: p?.pro_title || p?.product_name || "",
  sku: p?.sku || "",
  product_type: p?.type_code || p?.product_type || "",
  category: p?.brnd_code || p?.category || "",
   target_cost: Number(p?.target_cost ?? 0) || 0,
  _raw: p,
});

export default function useProductSearch() {


  console.log("useProductSearch")

  const [mode, setMode] = useState("name"); // "name" | "sku"
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState([]); // <-- data only
  const reqSeq = useRef(0);

  const fetchInitialProducts = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching initial products...');
      const res = await apiClient.get("/api/v1/sourcing/products/search", { params: { page: 1, limit: 50 } });
      console.log('Initial products response:', res.data);
      const list = extractList(res.data).map(normalize).filter((p) => p.id);
      console.log('Processed products:', list);
      setProducts(list);
    } catch (e) {
      console.error('Failed to fetch initial products:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async (q) => {
    const query = (q || "").trim();
    setTerm(query);

    if (!query) {
      fetchInitialProducts();
      return;
    }

    const myReq = ++reqSeq.current;
    setLoading(true);
    try {
      const params =
        mode === "sku"
          ? { q: query, page: 1, limit: 50, field: "sku" }
          : { search: query, page: 1, limit: 50 };

      const res = await apiClient.get("/api/v1/products/search", { params });
      if (myReq !== reqSeq.current) return; // ignore stale

      const list = extractList(res.data).map(normalize).filter((p) => p.id);
      setProducts(list);
    } catch (e) {
      if (myReq === reqSeq.current) setProducts([]);
    } finally {
      if (myReq === reqSeq.current) setLoading(false);
    }
  }, [mode]);

  const debouncedSearch = useMemo(() => debounce(fetchProducts, 250), [fetchProducts]);

  return {
    mode,
    setMode,
    loading,
    term,
    setTerm,
    products,
    debouncedSearch,
    fetchInitialProducts
  };
}