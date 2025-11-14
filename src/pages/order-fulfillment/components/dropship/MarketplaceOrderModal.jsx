import { Modal, Input } from "antd";

export default function MarketplaceOrderModal({ 
  open, 
  onCancel, 
  statusForm, 
  setStatusForm, 
  onSubmit, 
  submitting 
}) {
  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <Modal
      title="Create Marketplace Order"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Create Order"
      width={600}
    >
      <div className="space-y-4 py-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marketplace Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={statusForm.marketplaceName}
            onChange={(e) => setStatusForm((prev) => ({ ...prev, marketplaceName: e.target.value }))}
            placeholder="e.g., Shopify, WooCommerce"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marketplace Order Number <span className="text-red-500">*</span>
          </label>
          <Input
            value={statusForm.marketplaceOrderNumber}
            onChange={(e) => setStatusForm((prev) => ({ ...prev, marketplaceOrderNumber: e.target.value }))}
            placeholder="e.g., SH-12345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <Input.TextArea
            value={statusForm.notes}
            onChange={(e) => setStatusForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Order created successfully"
            rows={4}
          />
        </div>
      </div>
    </Modal>
  );
}

