

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
      return false;
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
