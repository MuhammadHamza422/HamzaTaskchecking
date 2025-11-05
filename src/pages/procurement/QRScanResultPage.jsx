import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Card,
  Button,
  Space,
  Table,
  Descriptions,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  Breadcrumb,
} from "antd";
import {
  ArrowLeft,
  Package,
  Box,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import dayjs from "dayjs";

const { Title, Text } = Typography;

/**
 * QR Scan Result Page
 * Displays detailed information about scanned QR codes (boxes, products, kits)
 */
const QRScanResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scanData, qrData, poId } = location.state || {};

  // If no scan data, redirect back
  if (!scanData) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No scan data available</p>
            <Button onClick={() => navigate("/procurement/orders")}>
              Back to Purchase Orders
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { type } = scanData;
  const purchaseOrder = scanData.purchaseOrder;

  // Format currency
  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Render based on type
  const renderContent = () => {
    switch (type) {
      case "box":
        return renderBoxContent();
      case "product":
        return renderProductContent();
      case "kit":
        return renderKitContent();
      default:
        return <p>Unknown scan type</p>;
    }
  };

  // Render Box Content
  const renderBoxContent = () => {
    const { box, items, summary } = scanData;

    const itemColumns = [
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        width: 100,
        render: (type) => (
          <Tag color={type === "kit" ? "purple" : "blue"}>
            {type === "kit" ? "Kit" : "Product"}
          </Tag>
        ),
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
      },
      {
        title: "SKU",
        dataIndex: "sku",
        key: "sku",
        render: (sku) => sku || "-",
      },
      {
        title: "Quantity",
        dataIndex: "quantity",
        key: "quantity",
        align: "right",
      },
      {
        title: "UOM",
        dataIndex: "uom",
        key: "uom",
        width: 80,
      },
      {
        title: "Unit Price",
        dataIndex: "unitPrice",
        key: "unitPrice",
        align: "right",
        render: (price) => formatCurrency(price),
      },
      {
        title: "Total Value",
        dataIndex: "totalValue",
        key: "totalValue",
        align: "right",
        render: (value) => formatCurrency(value),
      },
    ];

    return (
      <>
        <Card size="small" className="mb-4">
          <Descriptions title="Box Information" column={2} size="small">
            <Descriptions.Item label="Box ID">{box?.boxId || box?._id}</Descriptions.Item>
            <Descriptions.Item label="Box Name">{box?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="PO Reference">
              {purchaseOrder?.reference || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {purchaseOrder?.status || "-"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" className="mb-4">
          <Title level={5}>Summary</Title>
          <Row gutter={16}>
            <Col span={6}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{summary?.totalItems || 0}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{summary?.totalQuantity || 0}</div>
                <div className="text-sm text-gray-600">Total Quantity</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{summary?.totalProducts || 0}</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{summary?.totalKits || 0}</div>
                <div className="text-sm text-gray-600">Kits</div>
              </div>
            </Col>
          </Row>
          <Divider />
          <div className="text-right">
            <Text strong className="text-lg">
              Total Value: {formatCurrency(summary?.totalValue || 0)}
            </Text>
          </div>
        </Card>

        <Card size="small">
          <Title level={5}>Box Items</Title>
          <Table
            dataSource={items || []}
            columns={itemColumns}
            rowKey={(record, index) => `${record.productId || record.kitId}-${index}`}
            pagination={false}
            size="small"
          />
        </Card>
      </>
    );
  };

  // Render Product Content
  const renderProductContent = () => {
    const { product, purchaseOrderContext, boxContext } = scanData;

    return (
      <>
        <Card size="small" className="mb-4">
          <Descriptions title="Product Information" column={2} size="small">
            <Descriptions.Item label="Product Name">{product?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="SKU">{product?.sku || "-"}</Descriptions.Item>
            <Descriptions.Item label="Category">{product?.category || "-"}</Descriptions.Item>
            <Descriptions.Item label="UOM">{product?.uom || "-"}</Descriptions.Item>
            <Descriptions.Item label="Unit Price">
              {formatCurrency(product?.unitPrice || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {product?.description || "-"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {purchaseOrderContext && (
          <Card size="small" className="mb-4">
            <Title level={5}>Purchase Order Context</Title>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="PO Reference">
                {purchaseOrderContext.reference || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity in PO">
                {purchaseOrderContext.quantity || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Received Quantity">
                {purchaseOrderContext.receivedQty || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Billed Quantity">
                {purchaseOrderContext.billedQty || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Unit Price">
                {formatCurrency(
                  purchaseOrderContext.details?.unitPrice ||
                    purchaseOrderContext.unitPrice ||
                    0
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                {formatCurrency(purchaseOrderContext.details?.amount || 0)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {boxContext && (
          <Card size="small">
            <Title level={5}>Box Context</Title>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Box ID">{boxContext.boxId || "-"}</Descriptions.Item>
              <Descriptions.Item label="Box Name">{boxContext.boxName || "-"}</Descriptions.Item>
              <Descriptions.Item label="Quantity in Box">
                {boxContext.quantityInBox || 0}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </>
    );
  };

  // Render Kit Content
  const renderKitContent = () => {
    const { kit, kitProducts, summary } = scanData;

    const kitProductColumns = [
      {
        title: "Product Name",
        dataIndex: "name",
        key: "name",
      },
      {
        title: "SKU",
        dataIndex: "sku",
        key: "sku",
        render: (sku) => sku || "-",
      },
      {
        title: "Quantity",
        dataIndex: "quantity",
        key: "quantity",
        align: "right",
      },
      {
        title: "UOM",
        dataIndex: "uom",
        key: "uom",
        width: 80,
      },
      {
        title: "Unit Price",
        dataIndex: "unitPrice",
        key: "unitPrice",
        align: "right",
        render: (price) => formatCurrency(price),
      },
      {
        title: "Total Price",
        dataIndex: "totalPrice",
        key: "totalPrice",
        align: "right",
        render: (price) => formatCurrency(price),
      },
    ];

    return (
      <>
        <Card size="small" className="mb-4">
          <Descriptions title="Kit Information" column={2} size="small">
            <Descriptions.Item label="Kit ID">{scanData.kitId || "-"}</Descriptions.Item>
            <Descriptions.Item label="Kit Name">{kit?.name || "-"}</Descriptions.Item>
            <Descriptions.Item label="PO Reference">
              {purchaseOrder?.reference || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Kit Quantity">
              {kit?.quantity || summary?.totalKitQuantity || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Kit Unit Price">
              {formatCurrency(kit?.unitPrice || 0)}
            </Descriptions.Item>
            <Descriptions.Item label="Kit Total Value">
              {formatCurrency(kit?.totalValue || summary?.totalKitValue || 0)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" className="mb-4">
          <Title level={5}>Summary</Title>
          <Row gutter={16}>
            <Col span={8}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{summary?.totalComponents || 0}</div>
                <div className="text-sm text-gray-600">Components</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">
                  {summary?.totalComponentsQuantity || 0}
                </div>
                <div className="text-sm text-gray-600">Total Components Qty</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">
                  {formatCurrency(summary?.totalKitValue || 0)}
                </div>
                <div className="text-sm text-gray-600">Kit Value</div>
              </div>
            </Col>
          </Row>
        </Card>

        <Card size="small">
          <Title level={5}>Kit Components</Title>
          <Table
            dataSource={kitProducts || []}
            columns={kitProductColumns}
            rowKey={(record, index) => `${record.productId}-${index}`}
            pagination={false}
            size="small"
          />
        </Card>
      </>
    );
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement">Procurement</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement/orders">Purchase Orders</Link>
          </Breadcrumb.Item>
          {purchaseOrder && (
            <Breadcrumb.Item>
              <Link to={`/procurement/orders/${purchaseOrder._id || poId}`}>
                {purchaseOrder.reference}
              </Link>
            </Breadcrumb.Item>
          )}
          <Breadcrumb.Item>Scan Result</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4">
          <Button
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate(-1)}
            className="mb-2"
            size="small"
          >
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {type === "box" && <Box size={24} className="text-blue-600" />}
              {type === "product" && <Package size={24} className="text-green-600" />}
              {type === "kit" && <ShoppingBag size={24} className="text-purple-600" />}
              <Title level={2} className="mb-0">
                {type === "box"
                  ? "Box Details"
                  : type === "product"
                  ? "Product Details"
                  : "Kit Details"}
              </Title>
              <Tag color={type === "box" ? "blue" : type === "kit" ? "purple" : "green"}>
                {type?.toUpperCase()}
              </Tag>
            </div>
            {purchaseOrder && (
              <Link to={`/procurement/orders/${purchaseOrder._id || poId}`}>
                <Button icon={<ExternalLink size={14} />} size="small">
                  View Purchase Order
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Purchase Order Info */}
        {purchaseOrder && (
          <Card size="small" className="mb-4">
            <Descriptions title="Purchase Order Information" column={3} size="small">
              <Descriptions.Item label="PO Reference">
                {purchaseOrder.reference || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Vendor">
                {purchaseOrder.vendor?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag>{purchaseOrder.status || "-"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created Date">
                {purchaseOrder.createdDate
                  ? dayjs(purchaseOrder.createdDate).format("YYYY-MM-DD HH:mm")
                  : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Scan Timestamp */}
        {scanData.scannedAt && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle size={16} />
            <span>
              Scanned at: {dayjs(scanData.scannedAt).format("YYYY-MM-DD HH:mm:ss")}
            </span>
          </div>
        )}

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default QRScanResultPage;

