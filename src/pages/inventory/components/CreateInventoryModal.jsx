import React from "react";
import { Modal } from "antd";
import { Loader2 } from "lucide-react";

const productTypes = [
  { label: "Consoles", code: "CON" },
  { label: "Handhelds", code: "HAN" },
  { label: "Accessories", code: "ACC" },
  { label: "Games", code: "GAM" },
];

export default function CreateInventoryModal({
  isOpen,
  onClose,
  getContainer,
  isFullscreen,
  zoneName,
  form,
  setForm,
  productsData,
  onSubmit,
  isSaving,
  createInvLoading,
  dropdownRef,
}) {
  return (
    <Modal
      getContainer={getContainer}
      key={String(isFullscreen)}
      open={isOpen}
      onCancel={onClose}
      centered
      footer={null}
      width={600}
      closable={true}
      title={null}
      className="max-h-[95vh] overflow-y-auto"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Inventory</h3>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZoneName</label>
            <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600">{zoneName}</div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {productTypes.map((type) => (
                <button
                  key={type.code}
                  type="button"
                  onClick={() => {
                    if (form.typeCode === type.code) {
                      setForm((prev) => ({
                        ...prev,
                        type: "",
                        typeCode: "",
                        productId: "",
                        productSearch: "",
                        showProductDropdown: false,
                        selectedProduct: null,
                      }));
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        type: type.label,
                        typeCode: type.code,
                        productId: "",
                        productSearch: "",
                        showProductDropdown: false,
                        selectedProduct: null,
                      }));
                    }
                  }}
                  className={`
                    p-2 rounded-lg border text-sm font-medium transition-all duration-200
                    ${form.typeCode === type.code ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
                  `}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {form.typeCode ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Product</label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={form.productSearch}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      productSearch: e.target.value,
                      showProductDropdown: true,
                      productId: "",
                    }));
                  }}
                  onFocus={() => setForm((prev) => ({ ...prev, showProductDropdown: true }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
                {form.showProductDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg h-60 overflow-y-auto">
                    {productsData?.products?.length > 0 ? (
                      productsData.products.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              productId: p._id,
                              productSearch: p.pro_title || p.sku,
                              showProductDropdown: false,
                              selectedProduct: p,
                            }));
                          }}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                        >
                          <div className="font-medium">{p.pro_title}</div>
                          <div className="text-xs text-gray-500">{p.sku}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {productsData?.products ? "No products found" : "Loading products..."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value.replace(/[^0-9]/g, "") }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="e.g., 5"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border">Cancel</button>
            <button
              type="submit"
              disabled={isSaving || createInvLoading || !form.productId || !form.quantity}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving || createInvLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}


