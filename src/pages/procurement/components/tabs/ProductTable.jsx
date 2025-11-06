import React from "react";
import { Table, Button, Tag, Checkbox, Card } from "antd";
import { Package, QrCode, Trash2 } from "lucide-react";

const ProductTable = ({
  products,
  selectedIndices,
  onCheckboxChange,
  onSelectAll,
  onQRCodeClick,
  onRemoveProduct,
  currency,
  formatCurrency,
  isDraft = false,
}) => {
  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={
            selectedIndices.length > 0 && selectedIndices.length < products.length
          }
          checked={products.length > 0 && selectedIndices.length === products.length}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record, index) => (
        <Checkbox
          checked={selectedIndices.includes(index)}
          onChange={(e) => onCheckboxChange(index, e.target.checked)}
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
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                {record.name || "N/A"}
              </div>
              <Tag color="blue" size="small" className="mt-1">
                Kit ({record.kitProducts?.length || 0} products)
              </Tag>
            </div>
          );
        }
        return (
          <div>
            <div className="font-medium text-gray-900">{record.name || "N/A"}</div>
            <div className="text-xs text-gray-500 mt-1">SKU: {record.sku || "N/A"}</div>
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
      render: (taxes) => (taxes ? formatCurrency(taxes, currency) : "-"),
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
      render: (_, record) => (
        <Button
          type="link"
          icon={<QrCode size={16} />}
          onClick={() => onQRCodeClick(record)}
          size="small"
        >
          QR
        </Button>
      ),
    },
    ...(isDraft
      ? [
          {
            title: "Action",
            key: "action",
            width: 80,
            render: (_, record, index) => (
              <Button
                type="text"
                danger
                icon={<Trash2 size={14} />}
                onClick={() => onRemoveProduct(index)}
                size="small"
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          dataSource={products}
          rowKey={(record, index) => record.productId || record.kitId || record._id || index}
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
        />
      </div>

      <div className="md:hidden space-y-3">
        {products.map((product, index) => (
          <Card key={product.productId || product.kitId || product._id || index} size="small">
            <div className="flex items-start justify-between gap-3 mb-3">
              <Checkbox
                checked={selectedIndices.includes(index)}
                onChange={(e) => onCheckboxChange(index, e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                {product.type === "kit" ? (
                  <>
                    <div className="font-medium text-gray-900 flex items-center gap-2 mb-1">
                      <Package size={16} className="text-blue-600" />
                      {product.name || "N/A"}
                    </div>
                    <Tag color="blue" size="small">Kit</Tag>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-gray-900 mb-1">{product.name || "N/A"}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku || "N/A"}</div>
                  </>
                )}
              </div>
              {isDraft && (
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={() => onRemoveProduct(index)}
                  size="small"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
              <div>
                <div className="text-gray-400 text-xs mb-1">Quantity</div>
                <div className="font-medium">{product.quantity || 0}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">UoM</div>
                <div className="font-medium">{product.uom || "-"}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

export default ProductTable;

