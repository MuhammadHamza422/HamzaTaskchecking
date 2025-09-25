import React from "react";
import { Minus, Plus } from "lucide-react";

export default function NotShelfTable({
  items,
  pendingQtyChanges,
  setPendingQtyChanges,
  handleQuantityInputChange,
  handleUpdateQty,
  onOpenMove,
  role,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg border">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Product
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Quantity
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={`border-t ${
                idx % 2 !== 0 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <td className="px-4 py-3 text-sm font-medium">
                {item.productTitle}
              </td>
              <td className="px-4 py-3 text-xs font-mono">
                {item.sku || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.quantity}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                    <button
                      disabled={
                        Number(item.quantity) <= 0 || role === "Technician"
                      }
                      onClick={() => {
                        const currentPending = pendingQtyChanges.get(item.id);
                        const baseQty = currentPending
                          ? currentPending.newQty
                          : Number(item.quantity);
                        const newQty = Math.max(0, baseQty - 1);
                        setPendingQtyChanges((prev) => {
                          const newMap = new Map(prev);
                          newMap.set(item.id, {
                            currentQty: Number(item.quantity),
                            newQty,
                            type: "decrease",
                          });
                          return newMap;
                        });
                      }}
                      className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                        Number(item.quantity) <= 0
                          ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                          : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                      }`}
                      title="Decrease by 1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      value={
                        pendingQtyChanges.has(item.id)
                          ? pendingQtyChanges.get(item.id).newQty
                          : item.quantity || ""
                      }
                      onChange={(e) =>
                        handleQuantityInputChange(item.id, e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const pendingChange = pendingQtyChanges.get(item.id);
                          if (pendingChange) {
                            const key =
                              pendingChange.newQty > pendingChange.currentQty
                                ? "added"
                                : "removed";
                            handleUpdateQty(item.id, pendingChange.newQty, key);
                          }
                        }
                      }}
                      className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                    />
                    <button
                      disabled={role === "Picker"}
                      onClick={() => {
                        const currentPending = pendingQtyChanges.get(item.id);
                        const baseQty = currentPending
                          ? currentPending.newQty
                          : Number(item.quantity);
                        const newQty = baseQty + 1;
                        setPendingQtyChanges((prev) => {
                          const newMap = new Map(prev);
                          newMap.set(item.id, {
                            currentQty: Number(item.quantity),
                            newQty,
                            type: "increase",
                          });
                          return newMap;
                        });
                      }}
                      className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white"
                      title="Increase by 1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onOpenMove(item.id)}
                    className="ml-2 h-9 px-3 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700"
                    title="Move to another zone"
                  >
                    Move
                  </button>
                </div>

                {pendingQtyChanges.has(item.id) && (
                  <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {item.productTitle}
                    </h2>
                    <div className="flex items-center max-sm:justify-end space-x-2">
                      <p className="text-sm font-medium text-blue-700">
                        New qty: {pendingQtyChanges.get(item.id)?.newQty}
                      </p>
                      <button
                        onClick={() => {
                          const pendingChange = pendingQtyChanges.get(item.id);
                          if (pendingChange) {
                            const key =
                              pendingChange.newQty > pendingChange.currentQty
                                ? "added"
                                : "removed";
                            handleUpdateQty(item.id, pendingChange.newQty, key);
                          }
                        }}
                        className="px-3 py-2 text-sm tracking-wide bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Validate
                      </button>
                      <button
                        onClick={() => {
                          setPendingQtyChanges((prev) => {
                            const newMap = new Map(prev);
                            newMap.delete(item.id);
                            return newMap;
                          });
                        }}
                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
