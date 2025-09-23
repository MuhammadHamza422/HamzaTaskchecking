
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { debounce } from "lodash";
import apiClient from "../../../api/client";

const extractList = (data) =>
  Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];

const normalize = (p) => ({
  id: p?._id || p?.id,
  pro_title: p?.pro_title || p?.product_name || "",
  product_name: p?.pro_title || p?.product_name || "",
  sku: p?.sku || "",
  type_code: p?.type_code || p?.product_type || "",
  brnd_code: p?.brnd_code || p?.category || "",
  target_cost: Number(p?.target_cost ?? 0) || 0,
  _raw: p,
});

export default function useProductSearch(typeCode) {
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState("");
  const [products, setProducts] = useState([]);
  const reqSeq = useRef(0);

  const fetchInitialProducts = useCallback(async () => {
    const myReq = ++reqSeq.current;
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/products/all", {
        params: { page: 1, limit: 50, ...(typeCode ? { type: typeCode } : {}) },
      });
      if (myReq !== reqSeq.current) return;
      setProducts(extractList(res.data).map(normalize).filter((p) => p.id));
    } catch {
      if (myReq === reqSeq.current) setProducts([]);
    } finally {
      if (myReq === reqSeq.current) setLoading(false);
    }
  }, [typeCode]);

  const fetchProducts = useCallback(
    async (q) => {
      const query = (q || "").trim();
      setTerm(query);
      const myReq = ++reqSeq.current;
      setLoading(true);
      try {
        const res = await apiClient.get("/api/v1/products/all", {
          params: {
            page: 1,
            limit: 50,
            search: query || undefined,
            ...(typeCode ? { type: typeCode } : {}),
          },
        });
        if (myReq !== reqSeq.current) return;
        setProducts(extractList(res.data).map(normalize).filter((p) => p.id));
      } catch {
        if (myReq === reqSeq.current) setProducts([]);
      } finally {
        if (myReq === reqSeq.current) setLoading(false);
      }
    },
    [typeCode]
  );

  const debouncedSearch = useMemo(() => debounce(fetchProducts, 250), [fetchProducts]);

  // 🚩 Refetch when the type changes (and cancel any pending debounce)
  useEffect(() => {
    debouncedSearch.cancel();         // stop “ACC” request that hasn’t fired yet
    if (term.trim()) fetchProducts(term);
    else fetchInitialProducts();
  }, [typeCode, term, fetchProducts, fetchInitialProducts, debouncedSearch]);

  // Clean up on unmount
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  return { loading, term, products, debouncedSearch, fetchInitialProducts };
}
