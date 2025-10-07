import React from "react";
import { FiChevronDown } from "react-icons/fi";
import { Delete, Minus, Plus } from "lucide-react";
import { AiTwotoneDelete } from "react-icons/ai";

export default function ShelfGroupedView({
  groupedByShelf,
  pendingQtyChanges,
  setPendingQtyChanges,
  handleQuantityInputChange,
  handleUpdateQty,
  expandedBins,
  toggleBin,
  onOpenMove,
  userRole,
  handleDeleteInventory,
}) {
  if (!Array.isArray(groupedByShelf) || groupedByShelf.length === 0)
    return null;
  return (
    <div className="space-y-6">
      {groupedByShelf.map(({ shelfCode, shelfRows, bins }) => (
        <div key={shelfCode} className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div>
              <p className="font-bold text-xl uppercase tracking-wide">
                {shelfCode}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{`Items on shelf: ${shelfRows.length} · BIN groups: ${bins.size}`}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-100">
            {shelfRows.length > 0 && (
              <div className="mb-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-lg">
                    <thead className="border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Product
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-gray-700">
                          Warehouse
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-gray-700">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shelfRows.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-3 py-2 text-sm font-medium">
                            {r.productTitle}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono">
                            {r.sku || "N/A"}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {r.name}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                                {/* Minus button - enabled for Picker and Inventory Supervisor, disabled for Technician */}
                                {r.quantity > 0 ? (
                                  <button
                                    // disabled for Technician
                                    disabled={
                                      Number(r.quantity) <= 0 ||
                                      userRole === "Technician"
                                    }
                                    onClick={() => {
                                      const currentPending =
                                        pendingQtyChanges.get(r.id);
                                      const baseQty = currentPending
                                        ? currentPending.newQty
                                        : Number(r.quantity);
                                      const newQty = Math.max(0, baseQty - 1);
                                      setPendingQtyChanges((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(r.id, {
                                          currentQty: Number(r.quantity),
                                          newQty,
                                          type: "decrease",
                                        });
                                        return newMap;
                                      });
                                    }}
                                    className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                      Number(r.quantity) <= 0
                                        ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                        : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                                    }`}
                                    title="Decrease by 1"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      handleDeleteInventory(r.id);
                                    }}
                                    className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors text-white bg-red-600`}
                                    title="Decrease by 1"
                                  >
                                    <AiTwotoneDelete className="w-4 h-4" />
                                  </button>
                                )}
                                <input
                                  value={
                                    pendingQtyChanges.has(r.id)
                                      ? pendingQtyChanges.get(r.id).newQty
                                      : r.quantity || ""
                                  }
                                  onChange={(e) =>
                                    handleQuantityInputChange(
                                      r.id,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const pendingChange =
                                        pendingQtyChanges.get(r.id);
                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r.id,
                                          pendingChange.newQty,
                                          key
                                        );
                                      }
                                    }
                                  }}
                                  className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                />
                                {/* Plus button will be disabled for picker only */}
                                <button
                                  disabled={userRole === "Picker"}
                                  onClick={() => {
                                    const currentPending =
                                      pendingQtyChanges.get(r.id);
                                    const baseQty = currentPending
                                      ? currentPending.newQty
                                      : Number(r.quantity);
                                    const newQty = baseQty + 1;
                                    setPendingQtyChanges((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(r.id, {
                                        currentQty: Number(r.quantity),
                                        newQty,
                                        type: "increase",
                                      });
                                      return newMap;
                                    });
                                  }}
                                  className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Increase by 1"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => onOpenMove(r.id)}
                                className="p-2 h-9 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700"
                              >
                                Move
                              </button>
                            </div>

                            {pendingQtyChanges.has(r.id) && (
                              <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                                <h2 className="text-xl sm:text-2xl font-bold">
                                  {r.productTitle}
                                </h2>
                                <div className="flex items-center max-sm:justify-end space-x-2">
                                  <p className="text-sm font-medium text-blue-700">
                                    New qty:{" "}
                                    {pendingQtyChanges.get(r.id)?.newQty}
                                  </p>
                                  <button
                                    onClick={() => {
                                      const pendingChange =
                                        pendingQtyChanges.get(r.id);
                                      if (pendingChange) {
                                        const key =
                                          pendingChange.newQty >
                                          pendingChange.currentQty
                                            ? "added"
                                            : "removed";
                                        handleUpdateQty(
                                          r.id,
                                          pendingChange.newQty,
                                          key
                                        );
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
                                        newMap.delete(r.id);
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
              </div>
            )}

            {Array.from(bins.entries()).map(([binCode, rows]) => {
              const isOpen = expandedBins.has(binCode);
              return (
                <div
                  key={binCode}
                  className="mb-4 last:mb-0 bg-white p-0 rounded-lg"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleBin(binCode)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleBin(binCode);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`transform transition-transform duration-200 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        <FiChevronDown />
                      </span>
                      <div>
                        <p className="text-base font-semibold">{binCode}</p>
                        <p className="text-sm text-gray-500">
                          {rows.length} item{rows.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {isOpen ? "Collapse" : "Expand"}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 border-t">
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg">
                          <thead className="border-b">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                Product
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-mono text-gray-700">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">
                                Warehouse
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-gray-700">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className="border-t">
                                <td className="px-3 py-2 text-sm font-medium">
                                  {r.productTitle}
                                </td>
                                <td className="px-3 py-2 text-xs font-mono">
                                  {r.sku || "N/A"}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {r.name}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9">
                                      {/* Minus button - enabled for Picker and Inventory Supervisor, disabled for Technician */}
                                      {(userRole === "Picker" ||
                                        userRole ===
                                          "Inventory Supervisor") && (
                                        <button
                                          disabled={Number(r.quantity) <= 0}
                                          onClick={() => {
                                            const currentPending =
                                              pendingQtyChanges.get(r.id);
                                            const baseQty = currentPending
                                              ? currentPending.newQty
                                              : Number(r.quantity);
                                            const newQty = Math.max(
                                              0,
                                              baseQty - 1
                                            );
                                            setPendingQtyChanges((prev) => {
                                              const newMap = new Map(prev);
                                              newMap.set(r.id, {
                                                currentQty: Number(r.quantity),
                                                newQty,
                                                type: "decrease",
                                              });
                                              return newMap;
                                            });
                                          }}
                                          className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                                            Number(r.quantity) <= 0
                                              ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                                              : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                                          }`}
                                          title="Decrease by 1"
                                        >
                                          <Minus className="w-4 h-4" />
                                        </button>
                                      )}
                                      <input
                                        value={
                                          pendingQtyChanges.has(r.id)
                                            ? pendingQtyChanges.get(r.id).newQty
                                            : r.quantity || ""
                                        }
                                        onChange={(e) =>
                                          handleQuantityInputChange(
                                            r.id,
                                            e.target.value
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const pendingChange =
                                              pendingQtyChanges.get(r.id);
                                            if (pendingChange) {
                                              const key =
                                                pendingChange.newQty >
                                                pendingChange.currentQty
                                                  ? "added"
                                                  : "removed";
                                              handleUpdateQty(
                                                r.id,
                                                pendingChange.newQty,
                                                key
                                              );
                                            }
                                          }
                                        }}
                                        className="w-14 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="0"
                                      />
                                      {/* Plus button - enabled for Technician and Inventory Supervisor, disabled for Picker */}
                                      {(userRole === "Technician" ||
                                        userRole ===
                                          "Inventory Supervisor") && (
                                        <button
                                          onClick={() => {
                                            const currentPending =
                                              pendingQtyChanges.get(r.id);
                                            const baseQty = currentPending
                                              ? currentPending.newQty
                                              : Number(r.quantity);
                                            const newQty = baseQty + 1;
                                            setPendingQtyChanges((prev) => {
                                              const newMap = new Map(prev);
                                              newMap.set(r.id, {
                                                currentQty: Number(r.quantity),
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
                                      )}
                                    </div>
                                    <button
                                      onClick={() => onOpenMove(r.id)}
                                      className="p-2 h-9 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700"
                                    >
                                      Move
                                    </button>
                                  </div>

                                  {pendingQtyChanges.has(r.id) && (
                                    <div className="fixed left-0 bottom-0 w-full p-5 bg-white flex flex-col sm:flex-row sm:items-center gap-y-2 justify-between duration-300 ease-in-out">
                                      <h2 className="text-xl sm:text-2xl font-bold">
                                        {r.productTitle}
                                      </h2>
                                      <div className="flex items-center max-sm:justify-end space-x-2">
                                        <p className="text-sm font-medium text-blue-700">
                                          New qty:{" "}
                                          {pendingQtyChanges.get(r.id)?.newQty}
                                        </p>
                                        <button
                                          onClick={() => {
                                            const pendingChange =
                                              pendingQtyChanges.get(r.id);
                                            if (pendingChange) {
                                              const key =
                                                pendingChange.newQty >
                                                pendingChange.currentQty
                                                  ? "added"
                                                  : "removed";
                                              handleUpdateQty(
                                                r.id,
                                                pendingChange.newQty,
                                                key
                                              );
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
                                              newMap.delete(r.id);
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
                    </div>
                  )}
                </div>
              );
            })}

            {shelfRows.length === 0 && bins.size === 0 && (
              <div className="px-4 py-8 text-center bg-white text-gray-500">
                No items in this shelf
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
