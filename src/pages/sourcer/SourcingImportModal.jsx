
import React, { useEffect, useMemo, useState } from "react";
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
  Alert,
} from "antd";
import { UploadOutlined, InboxOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";

const { Text, Title } = Typography;
const { Dragger } = Upload;

export default function SourcingImportModal({ open, onClose, onImported, autoCloseSeconds = 5 }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [serverResults, setServerResults] = useState(null);
  const [closeIn, setCloseIn] = useState(null); // countdown in seconds

  const reset = () => {
    setFile(null);
    setFileName("");
    setServerResults(null);
    setImporting(false);
    setCloseIn(null);
  };

  const handleCancel = () => {
    reset();
    onClose?.();
  };

  // auto-close countdown
  useEffect(() => {
    if (closeIn == null) return;
    if (closeIn <= 0) {
      handleCancel();
      return;
    }
    const t = setTimeout(() => setCloseIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeIn]);

  const uploadProps = {
    multiple: false,
    accept: ".csv,text/csv",
    beforeUpload: (f) => {
      setFile(f);
      setFileName(f.name);
      return false; // prevent auto upload
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

      const { data } = await apiClient.post("/api/v1/sourcing/import-csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setServerResults(data);

      const count = data?.results?.length ?? 0;
      message.success(`CSV processed successfully. Imported ${count} sourcing ID${count === 1 ? "" : "s"}.`);

      onImported?.(data);

      // start auto close countdown (still shows results/logs while counting down)
      setCloseIn(autoCloseSeconds);
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

  const resultColumns = useMemo(
    () => [
      {
        title: "Sourcing ID",
        dataIndex: "sourcing_id",
        render: (v) => <strong>#{v}</strong>,
        width: 120,
      },
      {
        title: "OrderId",
        dataIndex: "orderId",
        render: (v) => <code>{v}</code>,
        ellipsis: true,
      },
      {
        title: "Added",
        dataIndex: "itemsAdded",
        render: (v) => <Tag color={v > 0 ? "green" : "default"}>{v}</Tag>,
        width: 90,
        align: "center",
      },
      {
        title: "Updated",
        dataIndex: "itemsUpdated",
        render: (v) => <Tag color={v > 0 ? "blue" : "default"}>{v}</Tag>,
        width: 100,
        align: "center",
      },
      {
        title: "Target Total",
        dataIndex: "target_total_cost",
        align: "right",
        render: (v) => (v != null ? `$${Number(v).toFixed(2)}` : "—"),
        width: 140,
      },
      {
        title: "Actual Total",
        dataIndex: "total_actual_cost",
        align: "right",
        render: (v) => (v != null ? `$${Number(v).toFixed(2)}` : "—"),
        width: 140,
      },
      {
        title: "Efficiency",
        dataIndex: "purchase_efficiency",
        align: "right",
        render: (v) => {
          const n = Number(v || 0);
          const color = n >= 0 ? "green" : "red";
          const sign = n >= 0 ? "+" : "";
          return <span style={{ color }}>{`${sign}$${n.toFixed(2)}`}</span>;
        },
        width: 130,
      },
      {
        title: "Log Entries",
        dataIndex: "logs",
        render: (logs) => <Tag>{logs?.length || 0}</Tag>,
        width: 110,
        align: "center",
      },
    ],
    []
  );

  return (
    <Modal
      title="Import Sourcing Items (CSV by Sourcing ID)"
      open={open}
      onCancel={handleCancel}
      width={900}
      destroyOnClose
      footer={
        <Space>
          {closeIn != null ? (
            <Text type="secondary">Auto-closing in {closeIn}s…</Text>
          ) : null}
          <Button onClick={handleCancel}>
            {closeIn != null ? "Close now" : "Close"}
          </Button>
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

        {/* Warnings from server (e.g., CSV parse issues) */}
        {serverResults?.warnings?.length ? (
          <Alert
            type="warning"
            showIcon
            message="Import warnings"
            description={
              <div style={{ maxHeight: 160, overflow: "auto" }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {serverResults.warnings.map((w, idx) => (
                    <li key={idx}>
                      <code>{typeof w === "string" ? w : JSON.stringify(w)}</code>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />
        ) : null}

        {serverResults?.results?.length ? (
          <>
            <Divider />
            <Title level={5} style={{ marginBottom: 6 }}>
              Import Summary
            </Title>
            <Table
              rowKey={(r) => `${r.sourcing_id}-${r.orderId}`}
              dataSource={serverResults.results}
              columns={resultColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              expandable={{
                expandRowByClick: true,
                columnWidth: 48,
                expandedRowRender: (record) => (
                  <div style={{ padding: "6px 0" }}>
                    <Title level={5} style={{ margin: "6px 0" }}>
                      Logs
                    </Title>
                    <div
                      style={{
                        background: "#0b1020",
                        color: "#cbd5e1",
                        padding: 12,
                        borderRadius: 6,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                        whiteSpace: "pre-wrap",
                        maxHeight: 220,
                        overflow: "auto",
                      }}
                    >
                      {(record.logs || []).length
                        ? record.logs.join("\n")
                        : "No logs returned for this record."}
                    </div>
                  </div>
                ),
              }}
            />
          </>
        ) : null}
      </Space>
    </Modal>
  );
}
