// // components/AppBreadcrumbs.jsx
// import React, { useMemo } from "react";
// import { Breadcrumb } from "antd";
// import { Link, useLocation } from "react-router-dom";

// const defaultLabel = (seg) =>
//   seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// export default function AppBreadcrumbs({
//   fromLocation = true,
//   path,               
//   baseLabel = "Home",
//   baseTo = "/",
//   hide = [], 
//   labelMap = {},    
// }) {
//   const location = useLocation();

//   const pathname = fromLocation ? location.pathname : (path || "/");

//   const rawSegs = pathname.split("/").filter(Boolean);


//   const segs = useMemo(
//     () => rawSegs.filter((s) => !hide.includes(s)),
//     [rawSegs, hide]
//   );

//   const items = useMemo(() => {
//     const acc = [];
//     let full = "";
//     segs.forEach((seg) => {
//       full += `/${seg}`;
//       const label = labelMap[seg] ?? defaultLabel(seg);
//       acc.push({
//         title: <Link to={full}>{label}</Link>,
//       });
//     });
//     return acc;
//   }, [segs, labelMap]);

//   return (
//     <Breadcrumb
//       items={[
//         { title: <Link to={baseTo}>{baseLabel}</Link> },
//         ...items,
//       ]}
//     />
//   );
// }



// components/AppBreadcrumbs.jsx
import React, { useMemo, useEffect, useState } from "react";
import { Breadcrumb } from "antd";
import { Link, useLocation } from "react-router-dom";
import apiClient from "../api/client"; // ← path from components -> api

const defaultLabel = (seg) =>
  seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const looksLikeObjectId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || ""));

export default function AppBreadcrumbs({
  fromLocation = true,
  path,
  baseLabel = "Home",
  baseTo = "/",
  hide = [],
  labelMap = {},
}) {
  const location = useLocation();
  const pathname = fromLocation ? location.pathname : (path || "/");

  const rawSegs = pathname.split("/").filter(Boolean);
  const segs = useMemo(() => rawSegs.filter((s) => !hide.includes(s)), [rawSegs, hide]);

  // --- NEW: fetch sourcing_id when the last segment is an ObjectId
  const lastSeg = segs[segs.length - 1] || null;
  const [humanId, setHumanId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHumanId(null);
      if (!lastSeg || !looksLikeObjectId(lastSeg)) return;
      try {
        const { data } = await apiClient.get(`/api/v1/sourcing/${lastSeg}`);
        const sid =
          data?.sourcing_id ??
          data?.sourcingId ??
          (Array.isArray(data) ? data[0]?.sourcing_id : null);
        if (!cancelled && sid != null) setHumanId(String(sid));
      } catch {
        // swallow; we'll just fall back to default label
      }
    })();
    return () => { cancelled = true; };
  }, [lastSeg]);

  const items = useMemo(() => {
    const acc = [];
    let full = "";
    segs.forEach((seg, idx) => {
      full += `/${seg}`;
      const isLast = idx === segs.length - 1;

      // default label or mapped
      let label = labelMap[seg] ?? defaultLabel(seg);

      // Replace last breadcrumb if it's an ObjectId
      if (isLast && looksLikeObjectId(seg)) {
        label = humanId != null ? `Sourcing #${humanId}` : "Sourcing";
      }

      acc.push({
        // Last crumb is plain text (not a link)
        title: isLast ? <span>{label}</span> : <Link to={full}>{label}</Link>,
      });
    });
    return acc;
  }, [segs, labelMap, humanId]);

  return (
    <Breadcrumb
      items={[
        { title: <Link to={baseTo}>{baseLabel}</Link> },
        ...items,
      ]}
    />
  );
}
