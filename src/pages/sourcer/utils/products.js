import React from "react";

export const escapeRegExp = (s = "") =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const highlight = (text = "", query = "") => {
  if (!query) return text;
  const safe = escapeRegExp(query);
  const rx = new RegExp(`(${safe})`, "ig");
  return String(text).split(rx).map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} style={{ padding: "0 2px", borderRadius: 3, background: "#ffe58f" }}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

// robustly extract list out of different response shapes
export const extractList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const normalizeProduct = (p) => ({
  id: p?._id || p?.id,
  product_name: p?.pro_title || p?.product_name,
  sku: p?.sku || "",
  product_type: p?.type_code || p?.product_type || "",
  category: p?.brnd_code || p?.category || "",
  target_cost_per_unit: Number(p?.price ?? p?.sale_price ?? 0) || 0,
  _raw: p,
});

export const matches = (np, q, mode) => {
  if (!q) return false;
  const rx = new RegExp(escapeRegExp(q), "i");
  return mode === "sku" ? rx.test(np.sku || "") : rx.test(np.product_name || "");
};
