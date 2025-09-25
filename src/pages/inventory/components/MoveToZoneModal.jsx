import React from "react";
import { Modal } from "antd";
import { Loader2, Minus, Plus } from "lucide-react";

export default function MoveToZoneModal({
  isOpen,
  onClose,
  getContainer,
  isFullscreen,
  zonesOptions,
  selectedMoveZoneId,
  setSelectedMoveZoneId,
  moveQty,
  setMoveQty,
  maxQty,
  onSubmit,
  isSubmitting,
  isLoading,
}) {
  return (
    <Modal
      getContainer={getContainer}
      key={`move-${String(isFullscreen)}`}
      open={isOpen}
      onCancel={onClose}
      centered
      footer={null}
      width={420}
      title={null}
      className="max-h-[95vh] overflow-y-auto"
    >
      <div>
        <h3 className="text-lg font-semibold">Move Inventory to Zone</h3>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Select Zone</label>
            <select
              value={selectedMoveZoneId}
              onChange={(e) => setSelectedMoveZoneId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-black focus:border-zinc-400"
            >
              <option value="" disabled>
                Choose a zone
              </option>
              {zonesOptions.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Quantity to move</label>
            <div className="mt-1 flex items-center rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 h-9 w-fit">
              <button
                type="button"
                disabled={Number(moveQty || 0) <= 1}
                onClick={() => setMoveQty((prev) => Math.max(1, Number(prev || 1) - 1))}
                className={`px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors ${
                  Number(moveQty || 0) <= 1
                    ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                    : "text-red-400 bg-red-100 hover:bg-red-800 hover:text-white"
                }`}
                title="Decrease by 1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                value={moveQty ?? ""}
                onChange={(e) => {
                  const raw = e.target.value || "";
                  const numeric = raw.replace(/\D/g, "");
                  if (numeric === "") {
                    setMoveQty("")
                    return;
                  }
                  const n = Math.min(Number(maxQty || 0), Math.max(1, parseInt(numeric)));
                  setMoveQty(n);
                }}
                onBlur={() => {
                  const n = Number(moveQty || 0);
                  if (!Number.isFinite(n) || n < 1) setMoveQty(1);
                  else if (n > Number(maxQty || 0)) setMoveQty(Number(maxQty || 1));
                }}
                className="w-16 text-center px-3 py-2 text-sm bg-white border-l border-r outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 transition-colors"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
              />
              <button
                type="button"
                onClick={() => setMoveQty((prev) => Math.min(Number(maxQty || 0), Number(prev || 1) + 1))}
                disabled={Number(moveQty || 0) >= Number(maxQty || 0)}
                className="px-3 h-full flex items-center justify-center text-sm duration-300 ease-in-out transition-colors bg-green-100 text-green-600 hover:bg-green-900 hover:text-white disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                title="Increase by 1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Max: {Number(maxQty || 0)}</p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMoveZoneId || isLoading || isSubmitting || Number(moveQty || 0) < 1}
              className={`rounded-lg cursor-pointer bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 flex items-center gap-2 ${
                isLoading || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {(isLoading || isSubmitting) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Moving…
                </>
              ) : (
                "Move"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
