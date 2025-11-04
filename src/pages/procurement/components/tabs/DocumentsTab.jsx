import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Space,
  Upload,
  message,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Skeleton,
  Image,
  Typography,
} from "antd";
import {
  Upload as UploadIcon,
  Trash2,
  Download,
  FileText,
  Eye,
  Plus,
} from "lucide-react";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  downloadDocument,
} from "../../../../api/procurement";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

/**
 * Documents Tab Component
 * Upload, view, download, and delete documents
 */
const DocumentsTab = ({ purchaseOrder, poId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  useEffect(() => {
    if (poId) {
      loadDocuments();
    }
  }, [poId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await getDocuments(poId, {
        page: pagination.page,
        limit: pagination.limit,
        sort: "-createdAt",
      });
      setDocuments(response?.data?.documents || []);
      setPagination({
        ...pagination,
        total: response?.data?.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Failed to load documents:", error);
      message.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const values = await form.validateFields();
      if (fileList.length === 0) {
        message.error("Please select a file to upload");
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append("file", fileList[0].originFileObj);
      if (values.name) {
        formData.append("name", values.name);
      }
      if (values.description) {
        formData.append("description", values.description);
      }
      if (values.category) {
        formData.append("category", values.category);
      }

      await uploadDocument(poId, formData);
      message.success("Document uploaded successfully");
      setUploadModalVisible(false);
      form.resetFields();
      setFileList([]);
      loadDocuments();
    } catch (error) {
      console.error("Failed to upload document:", error);
      message.error(
        error?.response?.data?.error?.message || "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    const document = documents.find((d) => d._id === documentId);
    const documentName = document?.name || document?.originalName || "this document";

    const result = await Swal.fire({
      title: "Delete Document?",
      text: `Are you sure you want to delete ${documentName}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument(poId, documentId);
        message.success("Document deleted successfully");
        loadDocuments();
      } catch (error) {
        console.error("Failed to delete document:", error);
        const errorMessage =
          error?.response?.data?.error?.message || "Failed to delete document";
        message.error(errorMessage);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: errorMessage,
        });
      }
    }
  };

  const handleDownload = async (document) => {
    try {
      // If fileUrl is available, open in new tab
      if (document.fileUrl) {
        window.open(document.fileUrl, "_blank");
      } else {
        // Otherwise, use download endpoint
        const blob = await downloadDocument(poId, document._id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = document.originalName || document.name;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download document:", error);
      message.error("Failed to download document");
    }
  };

  const handlePreview = (document) => {
    setPreviewDocument(document);
    setPreviewVisible(true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) {
      return "🖼️";
    } else if (fileType === "application/pdf") {
      return "📄";
    } else if (
      fileType?.includes("word") ||
      fileType === "application/msword" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return "📝";
    } else if (
      fileType?.includes("excel") ||
      fileType === "application/vnd.ms-excel" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return "📊";
    } else if (fileType === "text/csv") {
      return "📋";
    }
    return "📎";
  };

  const columns = [
    {
      title: "Document",
      key: "document",
      width: 300,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFileIcon(record.fileType)}</span>
          <div>
            <div className="font-medium">{record.name || record.originalName}</div>
            <div className="text-xs text-gray-500">
              {formatFileSize(record.fileSize)} • {record.fileType}
            </div>
            {record.description && (
              <div className="text-xs text-gray-400 mt-1">
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category) => (
        <Tag color="blue">{category || "other"}</Tag>
      ),
    },
    {
      title: "Uploaded By",
      key: "uploadedBy",
      width: 150,
      render: (_, record) => (
        <div>
          <div className="text-sm">{record.uploadedBy?.name || "Unknown"}</div>
          <div className="text-xs text-gray-500">
            {dayjs(record.createdAt).format("MMM DD, YYYY")}
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space>
          {record.fileType?.startsWith("image/") && (
            <Button
              type="link"
              icon={<Eye size={14} />}
              onClick={() => handlePreview(record)}
              size="small"
            >
              Preview
            </Button>
          )}
          <Button
            type="link"
            icon={<Download size={14} />}
            onClick={() => handleDownload(record)}
            size="small"
          >
            Download
          </Button>
          <Button
            type="link"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record._id)}
            size="small"
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const uploadProps = {
    beforeUpload: (file) => {
      // Check file size (10MB limit)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("File must be smaller than 10MB!");
        return false;
      }
      return false; // Prevent auto upload
    },
    fileList,
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 5 }} />;
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Title level={5} className="mb-0">
          Documents ({documents.length})
        </Title>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setUploadModalVisible(true)}
          size="middle"
        >
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No documents uploaded yet</p>
            <Button
              type="primary"
              icon={<UploadIcon size={16} />}
              onClick={() => setUploadModalVisible(true)}
              className="mt-4"
              size="middle"
            >
              Upload First Document
            </Button>
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          dataSource={documents}
          rowKey={(record) => record._id}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} documents`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, page, limit: pageSize });
              loadDocuments();
            },
          }}
          size="small"
        />
      )}

      {/* Upload Modal */}
      <Modal
        title="Upload Document"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setUploadModalVisible(false);
              form.resetFields();
              setFileList([]);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            onClick={handleUpload}
            loading={uploading}
            icon={<UploadIcon size={16} />}
          >
            Upload
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="File"
            required
            rules={[{ required: true, message: "Please select a file" }]}
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadIcon size={16} />}>Select File</Button>
            </Upload>
            <div className="text-xs text-gray-500 mt-2">
              Maximum file size: 10MB. All file types allowed.
            </div>
          </Form.Item>

          <Form.Item name="name" label="Document Name (Optional)">
            <Input placeholder="Custom name for the document" />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <TextArea
              rows={3}
              placeholder="Document description"
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category (Optional)"
            initialValue="other"
          >
            <Select placeholder="Select category">
              <Option value="invoice">Invoice</Option>
              <Option value="receipt">Receipt</Option>
              <Option value="contract">Contract</Option>
              <Option value="shipping">Shipping</Option>
              <Option value="customs">Customs</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal for Images */}
      <Modal
        title={previewDocument?.name || "Document Preview"}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewDocument(null);
        }}
        footer={[
          <Button
            key="download"
            icon={<Download size={16} />}
            onClick={() => {
              if (previewDocument) {
                handleDownload(previewDocument);
              }
            }}
          >
            Download
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {previewDocument?.fileUrl && (
          <Image
            src={previewDocument.fileUrl}
            alt={previewDocument.name}
            style={{ width: "100%" }}
            preview={false}
          />
        )}
      </Modal>
    </div>
  );
};

export default DocumentsTab;

