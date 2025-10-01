

// // // // /src/pages/purchaser/PurchaserDashboardPage.jsx
// // // import React, { useCallback, useEffect, useState } from "react";
// // // import { message } from "antd";
// // // import { useAuth } from "../../contexts/AuthContext";
// // // import apiClient from "../../api/client";
// // // import PurchaserDashboard from "./PurchaserDashboard";

// // // const pickRows = (body) =>
// // //   Array.isArray(body)
// // //     ? body
// // //     : body?.docs || body?.data || body?.results || body?.items || [];

// // // export default function PurchaserDashboardPage() {
// // //   const { user } = useAuth();
// // //   const role = String(user?.roles?.role || "").toLowerCase();
// // //   const isAdmin = role === "admin";

// // //   const [rows, setRows] = useState([]);
// // //   const [loading, setLoading] = useState(true);

// // //   const fetchData = useCallback(async () => {
// // //     setLoading(true);
// // //     try {
// // //       const { data } = await apiClient.get("/api/v1/sourcing/assigned", {
// // //         params: {
// // //           sort: "-createdAt",
// // //           page: 1,
// // //           limit: 200,
// // //           ...(isAdmin ? {} : { mine: true }),
// // //         },
// // //       });
// // //       setRows(pickRows(data));
// // //     } catch (e) {
// // //       message.error(e?.response?.data?.message || "Failed to load purchaser data.");
// // //       setRows([]);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [isAdmin]);

// // //   useEffect(() => {
// // //     fetchData();
// // //   }, [fetchData]);

// // //   return (
// // //     <PurchaserDashboard
// // //       data={rows}
// // //       loading={loading}
// // //       onRefresh={fetchData}
// // //       isAdmin={isAdmin}
// // //     />
// // //   );
// // // }



// // // /src/pages/purchaser/PurchaserDashboardPage.jsx
// // import React, { useCallback, useEffect, useState } from "react";
// // import { message } from "antd";
// // import { useAuth } from "../../contexts/AuthContext";
// // import apiClient from "../../api/client";
// // import PurchaserDashboard from "./PurchaserDashboard";

// // const pickRows = (body) =>
// //   Array.isArray(body)
// //     ? body
// //     : body?.docs || body?.data || body?.results || body?.items || [];

// // /** Normalize just enough so PurchaserDashboard's existing logic
// //  *  computes the first three metrics correctly:
// //  *  - Total Orders (unchanged)
// //  *  - Purchased (unchanged)
// //  *  - Average Response Time: use purchaserResponseTime (ms) when present.
// //  *
// //  *  PurchaserDashboard calculates avg as (purchaserActionTime - assignedAt).
// //  *  If we only have purchaserResponseTime (ms), synthesize purchaserActionTime
// //  *  by adding that many ms to assignedAt.
// //  */
// // const normalizeForMetrics = (rows = []) =>
// //   rows.map((r) => {
// //     const assignedAtRaw =
// //       r.assignedAt || r.assigned_at || r.createdAt || r.created_at || null;

// //     let purchaserActionTime = r.purchaserActionTime || r.purchaser_action_time || null;

// //     // If we have a numeric purchaserResponseTime (ms), synthesize action time
// //     // so the existing dashboard math (action - assigned) works.
// //     const respMs =
// //       typeof r.purchaserResponseTime === "number"
// //         ? r.purchaserResponseTime
// //         : typeof r.purchaser_response_time === "number"
// //         ? r.purchaser_response_time
// //         : null;

// //     if (!purchaserActionTime && assignedAtRaw && Number.isFinite(respMs) && respMs >= 0) {
// //       const base = new Date(assignedAtRaw);
// //       if (!isNaN(base.getTime())) {
// //         purchaserActionTime = new Date(base.getTime() + respMs).toISOString();
// //       }
// //     }

// //     return {
// //       ...r,
// //       // Ensure fields exist with the shapes PurchaserDashboard expects
// //       assignedAt: assignedAtRaw || null,
// //       purchaserActionTime: purchaserActionTime || null,
// //     };
// //   });

// // export default function PurchaserDashboardPage() {
// //   const { user } = useAuth();
// //   const role = String(user?.roles?.role || "").toLowerCase();
// //   const isAdmin = role === "admin";

// //   const [rows, setRows] = useState([]);
// //   const [loading, setLoading] = useState(true);

// //   const fetchData = useCallback(async () => {
// //     setLoading(true);
// //     try {
// //       // Use the correct endpoint for the viewer:
// //       // admins -> all assigned; purchasers -> only mine
// //       const endpoint = isAdmin
// //         ? "/api/v1/sourcing/assigned"
// //         : "/api/v1/sourcing/assigned/me";

// //       const { data } = await apiClient.get(endpoint, {
// //         params: { sort: "-createdAt", page: 1, limit: 200 },
// //       });

// //       const list = pickRows(data);
// //       setRows(normalizeForMetrics(list));
// //     } catch (e) {
// //       message.error(e?.response?.data?.message || "Failed to load purchaser data.");
// //       setRows([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [isAdmin]);

// //   useEffect(() => {
// //     fetchData();
// //   }, [fetchData]);

// //   return (
// //     <PurchaserDashboard
// //       data={rows}
// //       loading={loading}
// //       onRefresh={fetchData}
// //       isAdmin={isAdmin}
// //     />
// //   );
// // }



// // /src/pages/purchaser/PurchaserDashboardPage.jsx
// import React, { useCallback, useEffect, useState } from "react";
// import { message } from "antd";
// import { useAuth } from "../../contexts/AuthContext";
// import apiClient from "../../api/client";
// import PurchaserDashboard from "./PurchaserDashboard";

// const pickRows = (body) =>
//   Array.isArray(body)
//     ? body
//     : body?.docs || body?.data || body?.results || body?.items || [];

// // safe date parser
// const toDate = (v) => {
//   if (!v) return null;
//   const d = new Date(v);
//   return Number.isFinite(d.getTime()) ? d : null;
// };

// export default function PurchaserDashboardPage() {
//   const { user } = useAuth();
//   const role = String(user?.roles?.role || "").toLowerCase();
//   const isAdmin = role === "admin";

//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fetchData = useCallback(async () => {
//     setLoading(true);
//     try {
//       // Keep your original API shape and params
//       const { data } = await apiClient.get("/api/v1/sourcing/assigned", {
//         params: {
//           sort: "-createdAt",
//           page: 1,
//           limit: 200,
//           ...(isAdmin ? {} : { mine: true }),
//         },
//       });

//       const raw = pickRows(data);

//       // Use purchaserResponseTime (ms) directly to synthesize assignedAt/purchaserActionTime
//       // so PurchaserDashboard's existing KPI logic = average of purchaserResponseTime.
//       const enriched = raw.map((r) => {
//         const rtMs = Number(r?.purchaserResponseTime);
//         if (!Number.isFinite(rtMs) || rtMs < 0) return r;

//         // Prefer an existing assigned/created timestamp if present; fallback to "now - rtMs"
//         const assignedBase =
//           toDate(r?.assignedAt) ||
//           toDate(r?.assigned_at) ||
//           toDate(r?.createdAt) ||
//           toDate(r?.created_at) ||
//           new Date(Date.now() - rtMs);

//         const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);

//         return {
//           ...r,
//           // Ensure the fields exist as ISO strings for the dashboard’s diff math
//           assignedAt: assignedBase.toISOString(),
//           purchaserActionTime: purchaserActionDate.toISOString(),
//         };
//       });

//       setRows(enriched);
//     } catch (e) {
//       message.error(
//         e?.response?.data?.message || "Failed to load purchaser data."
//       );
//       setRows([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [isAdmin]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   return (
//     <PurchaserDashboard
//       data={rows}
//       loading={loading}
//       onRefresh={fetchData}
//       isAdmin={isAdmin}
//     />
//   );
// }



// /src/pages/purchaser/PurchaserDashboardPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import PurchaserDashboard from "./PurchaserDashboard";

const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

// safe date parser
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

export default function PurchaserDashboardPage() {
  const { user } = useAuth();
  const role = String(user?.roles?.role || "").toLowerCase();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use all-sourcing for admin to include Purchased and other states.
      const endpoint = isAdmin
        ? "/api/v1/sourcing/all-sourcing"
        : "/api/v1/sourcing/assigned";

      const params = {
        sort: "-createdAt",
        page: 1,
        limit: 200,
        ...(isAdmin ? {} : { mine: true }),
      };

      const { data } = await apiClient.get(endpoint, { params });
      const raw = pickRows(data);

      // Enrich for Average Response Time = avg(purchaserResponseTime)
      const enriched = raw.map((r) => {
        const rtMs = Number(r?.purchaserResponseTime);
        if (!Number.isFinite(rtMs) || rtMs < 0) return r;

        // Prefer an existing assigned/created timestamp; fallback to now - rtMs
        const assignedBase =
          toDate(r?.assignedAt) ||
          toDate(r?.assigned_at) ||
          toDate(r?.createdAt) ||
          toDate(r?.created_at) ||
          new Date(Date.now() - rtMs);

        const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);

        return {
          ...r,
          assignedAt: assignedBase.toISOString(),
          purchaserActionTime: purchaserActionDate.toISOString(),
        };
      });

      setRows(enriched);
    } catch (e) {
      message.error(
        e?.response?.data?.message || "Failed to load purchaser data."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PurchaserDashboard
      data={rows}
      loading={loading}
      onRefresh={fetchData}
      isAdmin={isAdmin}
    />
  );
}
