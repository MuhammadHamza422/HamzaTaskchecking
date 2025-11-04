import React, { useState } from "react";
import { Table, Button, Tag, Checkbox, Space, Image } from "antd";
import { Package, QrCode } from "lucide-react";
import { getProductQRCode } from "../../../../api/procurement";
import QRCodeModal from "../QRCodeModal";

/**
 * Products Tab Component
 * Shows products and kits with checkboxes and QR code buttons
 */
const ProductsTab = ({ purchaseOrder }) => {
  const [selectedProductIndices, setSelectedProductIndices] = useState([]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const products = purchaseOrder?.products || [];

  // Handle QR code button click
  const handleQRCodeClick = async (product) => {
    if (!purchaseOrder?._id) return;

    setLoadingQR(true);
    try {
      // Use productId for products, kitId for kits
      const productId = product.type === "kit" ? product.kitId : product.productId || product._id;
      const response = await getProductQRCode(
        purchaseOrder._id,
        productId,
        { format: "json" }
      );
      
      if (response?.success && response?.data) {
        setQrData({
          qrCode: response.data.qrCode,
          qrData: response.data.qrData,
          product: response.data.product || response.data.kit,
          type: product.type || "product",
        });
        setQrModalVisible(true);
      }
    } catch (error) {
      console.error("Failed to load QR code:", error);
    } finally {
      setLoadingQR(false);
    }
  };

  // Handle checkbox selection
  const handleCheckboxChange = (index, checked) => {
    if (checked) {
      setSelectedProductIndices((prev) => [...prev, index]);
    } else {
      setSelectedProductIndices((prev) => prev.filter((i) => i !== index));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProductIndices(products.map((_, idx) => idx));
    } else {
      setSelectedProductIndices([]);
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedProductIndices.length > 0 &&
            selectedProductIndices.length < products.length
          }
          checked={
            products.length > 0 &&
            selectedProductIndices.length === products.length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record, index) => (
        <Checkbox
          checked={selectedProductIndices.includes(index)}
          onChange={(e) => handleCheckboxChange(index, e.target.checked)}
        />
      ),
    },
    {
      title: "Product",
      key: "product",
      width: 300,
      render: (_, record) => {
        if (record.type === "kit") {
          return (
            <div>
              <div className="font-medium text-gray-900 flex items-center gap-2 shrink-0">
                <Package size={16} className="text-blue-600 shrink-0" />
                {record.name || "N/A"}
              </div>
              <Tag color="blue" size="small" className="mt-1">
                Kit ({record.kitProducts?.length || 0} products)
              </Tag>
              {record.kitProducts && record.kitProducts.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Contains: {record.kitProducts.slice(0, 2).map((p) => p.name).join(", ")}
                  {record.kitProducts.length > 2 && ` +${record.kitProducts.length - 2} more`}
                </div>
              )}
            </div>
          );
        }
        return (
          <div>
            <div className="font-medium text-gray-900">{record.name || "N/A"}</div>
            <div className="text-xs text-gray-500 mt-1">
              SKU: {record.sku || "N/A"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      align: "right",
    },
    {
      title: "Taxes",
      dataIndex: "taxes",
      key: "taxes",
      width: 100,
      align: "right",
      render: (taxes) =>
        taxes ? formatCurrency(taxes, purchaseOrder?.currency) : "-",
    },
    {
      title: "UoM",
      dataIndex: "uom",
      key: "uom",
      width: 80,
    },
    {
      title: "QR Code",
      key: "qrCode",
      width: 100,
      render: (_, record, index) => (
        <Button
          type="link"
          icon={<QrCode size={16} />}
          onClick={() => handleQRCodeClick(record)}
          loading={loadingQR}
          size="small"
        >
          QR
        </Button>
      ),
    },
  ];

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No products added to this purchase order</p>
      </div>
    );
  }

  return (
    <>
      <Table
        columns={columns}
        dataSource={products}
        rowKey={(record, index) => record.productId || record.kitId || record._id || index}
        pagination={false}
        size="small"
        scroll={{ x: 700 }}
      />
      
      {/* QR Code Modal */}
      {qrData && (
        <QRCodeModal
          visible={qrModalVisible}
          onCancel={() => {
            setQrModalVisible(false);
            setQrData(null);
          }}
          qrData={qrData}
        />
      )}
    </>
  );
};

export default ProductsTab;