
// // components/SourcingCsvImportModal.jsx
// import React, { useMemo, useState } from "react";
// import {
//   Modal,
//   Button,
//   Space,
//   Typography,
//   Upload,
//   Divider,
//   Table,
//   Alert,
//   message,
//   Tag,
// } from "antd";
// import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
// import Papa from "papaparse";
// import apiClient from "../../api/client";

// const { Text, Title } = Typography;
// const { Dragger } = Upload;

// const compact = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
// const normalizeSid = (v) => {
//   const n = Number(String(v ?? "").trim());
//   return Number.isFinite(n) ? Math.trunc(n) : null;
// };
// const mapHeader = (h) => {
//   const c = compact(h);
//   if (c === "sourcingid" || c === "sourcing_id") return "sourcing_id";
//   if (c === "productname") return "product_name";
//   if (c === "sku") return "sku";
//   if (c === "quantityneeded" || c === "quantity" || c === "qty") return "quantity_needed";
//   if (c === "sellersprice") return "sourced_price"; // line total
//   if (c === "sellerspriceperunit" || c === "sellerpriceperunit") return "seller_price_per_unit";
//   if (c === "producttype") return "product_type";
//   if (c === "category") return "category";
//   if (c === "productcondition") return "product_condition";
//   if (c === "testedoruntested" || c === "tested") return "tested";
//   if (c === "listinglink") return "listing_link";
//   if (c === "origin") return "origin";
//   if (c === "shippingcharges" || c === "shippingprice") return "shipping_charges";
//   if (c === "tax" || c === "taxes") return "taxes";
//   if (c === "status") return "status";
//   return h;
// };

// export default function SourcingImportModal({
//   open,
//   onClose,
//   onImported,              // (serverResponse) => void
//   defaultStatus = "Pending" // optional: backend may use this if creating orders
// }) {
//   const [file, setFile] = useState(null);
//   const [fileName, setFileName] = useState("");
//   const [parsing, setParsing] = useState(false);
//   const [sidPreview, setSidPreview] = useState([]); // [{ sid, count }]
//   const [parseWarnings, setParseWarnings] = useState([]);
//   const [importing, setImporting] = useState(false);
//   const [serverResults, setServerResults] = useState(null);

//   const reset = () => {
//     setFile(null);
//     setFileName("");
//     setSidPreview([]);
//     setParseWarnings([]);
//     setServerResults(null);
//     setImporting(false);
//   };

//   const handleCancel = () => {
//     reset();
//     onClose?.();
//   };

//   // Optional: quick SID preview for UX (not required for API)
//   const previewCsv = (blob) => {
//     setParsing(true);
//     Papa.parse(blob, {
//       header: true,
//       skipEmptyLines: "greedy",
//       transformHeader: mapHeader,
//       complete: (res) => {
//         const data = Array.isArray(res.data) ? res.data : [];
//         const nonEmpty = data.filter((row) =>
//           Object.values(row || {}).some((v) => String(v ?? "").trim() !== "")
//         );
//         const counts = new Map();
//         for (const r of nonEmpty) {
//           const sid = normalizeSid(r.sourcing_id);
//           if (sid == null) continue;
//           counts.set(sid, (counts.get(sid) || 0) + 1);
//         }
//         const list = Array.from(counts.entries()).map(([sid, count]) => ({ sid, count }));
//         setSidPreview(list.sort((a, b) => a.sid - b.sid));
//         setParseWarnings(res.errors || []);
//         setParsing(false);
//       },
//       error: (err) => {
//         message.error(`CSV parse error: ${err?.message || "Unknown error"}`);
//         setParsing(false);
//       },
//     });
//   };

//   const uploadProps = {
//     name: "file",
//     multiple: false,
//     accept: ".csv,text/csv",
//     beforeUpload: (f) => {
//       setFile(f);
//       setFileName(f.name);
//       // optional: client-side preview
//       previewCsv(f);
//       // block auto-upload; we'll POST manually
//       return false;
//     },
//     onRemove: () => {
//       setFile(null);
//       setFileName("");
//       setSidPreview([]);
//       setParseWarnings([]);
//     },
//     fileList: file ? [file] : [],
//   };

//   const resultColumns = useMemo(
//     () => [
//       { title: "Sourcing ID", dataIndex: "sourcing_id", width: 120,
//         render: (v) => <strong>#{v}</strong> },
//       { title: "OrderId (Mongo)", dataIndex: "orderId", width: 260,
//         render: (v) => <code>{v}</code> },
//       { title: "Added", dataIndex: "itemsAdded", width: 100,
//         render: (v) => <Tag color={v > 0 ? "green" : "default"}>{v}</Tag> },
//       { title: "Updated", dataIndex: "itemsUpdated", width: 110,
//         render: (v) => <Tag color={v > 0 ? "blue" : "default"}>{v}</Tag> },
//     ],
//     []
//   );

//   const canImport = !!file;

//   const handleImport = async () => {
//     if (!file) return;
//     try {
//       setImporting(true);
//     //   const form = new FormData();
//     //   form.append("file", file);


//      const form = new FormData();
//  const blob = file?.originFileObj ?? file;           // <-- ensure it's the real File/Blob
//  form.append("file", blob, file?.name || "import.csv");
//       if (defaultStatus) form.append("default_status", defaultStatus);

//     //   const { data } = await apiClient.post("/api/v1/sourcing/import-csv", form, {
//     //     headers: { "Content-Type": "multipart/form-data" },
//     //   });
//     const { data } = await apiClient.post("/api/v1/sourcing/import-csv", form);

//       setServerResults(data);
//       message.success("CSV processed");
//       onImported?.(data); // let parent refresh
//     } catch (err) {
//       const apiMsg =
//         err?.response?.data?.message ||
//         err?.response?.data?.detail ||
//         err?.message ||
//         "Import failed";
//       message.error(apiMsg);
//     } finally {
//       setImporting(false);
//     }
//   };

//   return (
//     <Modal
//       title="Import Sourcing Items (CSV · uses Sourcing ID only)"
//       open={open}
//       onCancel={handleCancel}
//       width={900}
//       destroyOnClose
//       footer={
//         <Space>
//           <Button onClick={handleCancel}>Close</Button>
//           <Button
//             type="primary"
//             icon={<UploadOutlined />}
//             onClick={handleImport}
//             loading={importing}
//             disabled={!canImport}
//           >
//             Import
//           </Button>
//         </Space>
//       }
//     >
//       <Space direction="vertical" size="large" style={{ width: "100%" }}>
//         {/* File picker */}
//         <Dragger {...uploadProps} disabled={importing}>
//           <p className="ant-upload-drag-icon">
//             <InboxOutlined />
//           </p>
//           <p className="ant-upload-text">Click or drag CSV file to this area</p>
//           <p className="ant-upload-hint">
//             The CSV must include a <code>Sourcing ID</code> column. If an order with that ID
//             doesn’t exist, the server will create it and append items.
//           </p>
//           {fileName ? <Text type="secondary">Selected: {fileName}</Text> : null}
//         </Dragger>

//         {/* Optional: quick SID preview */}
//         {parsing ? (
//           <Alert type="info" showIcon message="Parsing CSV..." />
//         ) : sidPreview.length ? (
//           <>
//             <Divider />
//             <Title level={5} style={{ marginBottom: 6 }}>Detected Sourcing IDs</Title>
//             <Space size={[8, 8]} wrap>
//               {sidPreview.map(({ sid, count }) => (
//                 <Tag key={sid} color="geekblue">#{sid} · {count} row(s)</Tag>
//               ))}
//             </Space>
//           </>
//         ) : null}

//         {parseWarnings?.length ? (
//           <Alert
//             type="warning"
//             showIcon
//             message="CSV parse warnings"
//             description={
//               <ul style={{ margin: 0, paddingLeft: 20 }}>
//                 {parseWarnings.slice(0, 5).map((e, i) => (
//                   <li key={i}>Row {e?.row}: {e?.message}</li>
//                 ))}
//                 {parseWarnings.length > 5 && (
//                   <li>…and {parseWarnings.length - 5} more</li>
//                 )}
//               </ul>
//             }
//           />
//         ) : null}

//         {/* Server results after import */}
//         {serverResults?.results?.length ? (
//           <>
//             <Divider />
//             <Title level={5} style={{ marginBottom: 6 }}>Import Summary</Title>
//             <Table
//               rowKey={(r) => `${r.sourcing_id}-${r.orderId}`}
//               dataSource={serverResults.results}
//               columns={resultColumns}
//               pagination={false}
//               size="small"
//             />
//           </>
//         ) : null}
//       </Space>
//     </Modal>
//   );
// }




// components/SourcingCsvImportModal.jsx
import React, { useState } from "react";
import {
  Modal,
  Button,
  Space,
  Typography,
  Upload,
  Table,
  Divider,
  message,
  Tag,
} from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";

const { Text, Title } = Typography;
const { Dragger } = Upload;

export default function SourcingImportModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [serverResults, setServerResults] = useState(null);

  const reset = () => {
    setFile(null);
    setFileName("");
    setServerResults(null);
    setImporting(false);
  };

  const handleCancel = () => {
    reset();
    onClose?.();
  };

  const uploadProps = {
    multiple: false,
    accept: ".csv,text/csv",
    beforeUpload: (f) => {
      setFile(f);
      setFileName(f.name);
      return false; // prevent auto-upload
    },
    onRemove: () => {
      setFile(null);
      setFileName("");
    },
    fileList: file ? [file] : [],
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      setImporting(true);
      const form = new FormData();
      const blob = file.originFileObj ?? file;
      form.append("file", blob, file.name || "import.csv");

      const { data } = await apiClient.post("/api/v1/sourcing/import-csv", form);
      setServerResults(data);
      message.success("CSV processed successfully");
      onImported?.(data);
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Import failed";
      message.error(apiMsg);
    } finally {
      setImporting(false);
    }
  };

  const resultColumns = [
    {
      title: "Sourcing ID",
      dataIndex: "sourcing_id",
      render: (v) => <strong>#{v}</strong>,
    },
    {
      title: "OrderId (Mongo)",
      dataIndex: "orderId",
      render: (v) => <code>{v}</code>,
    },
    {
      title: "Added",
      dataIndex: "itemsAdded",
      render: (v) => <Tag color={v > 0 ? "green" : "default"}>{v}</Tag>,
    },
    {
      title: "Updated",
      dataIndex: "itemsUpdated",
      render: (v) => <Tag color={v > 0 ? "blue" : "default"}>{v}</Tag>,
    },
  ];

  return (
    <Modal
      title="Import Sourcing Items (CSV by Sourcing ID)"
      open={open}
      onCancel={handleCancel}
      width={800}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={handleCancel}>Close</Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleImport}
            loading={importing}
            disabled={!file}
          >
            Import
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Dragger {...uploadProps} disabled={importing}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag CSV file to this area</p>
          <p className="ant-upload-hint">
            The CSV must include a <code>Sourcing ID</code> column.
          </p>
          {fileName ? <Text type="secondary">Selected: {fileName}</Text> : null}
        </Dragger>

        {serverResults?.results?.length ? (
          <>
            <Divider />
            <Title level={5} style={{ marginBottom: 6 }}>Import Summary</Title>
            <Table
              rowKey={(r) => `${r.sourcing_id}-${r.orderId}`}
              dataSource={serverResults.results}
              columns={resultColumns}
              pagination={false}
              size="small"
            />
          </>
        ) : null}
      </Space>
    </Modal>
  );
}
