import { Modal, Input, Select } from "antd";

export default function StatusUpdateModal({ 
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
      title="Update Status"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Update Status"
      width={600}
    >
      <div className="space-y-4 py-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <Select
            value={statusForm.status}
            onChange={(value) => setStatusForm((prev) => ({ ...prev, status: value }))}
            className="w-full"
            options={[
              { label: "Unfulfilled", value: "Unfulfilled" },
              { label: "Fulfilled", value: "Fulfilled" },
              { label: "Cancelled", value: "Cancelled" },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marketplace Name (Optional)</label>
          <Input
            value={statusForm.marketplaceName}
            onChange={(e) => setStatusForm((prev) => ({ ...prev, marketplaceName: e.target.value }))}
            placeholder="e.g., Shopify, WooCommerce"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marketplace Order Number (Optional)</label>
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
            placeholder="e.g., Order fulfilled via Shopify"
          />
        </div>
      </div>
    </Modal>
  );
}

