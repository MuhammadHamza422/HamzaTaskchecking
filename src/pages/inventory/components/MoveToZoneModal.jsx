import React from "react";
import { Modal } from "antd";
import { Loader2 } from "lucide-react";

export default function MoveToZoneModal({
  isOpen,
  onClose,
  getContainer,
  isFullscreen,
  zonesOptions,
  selectedMoveZoneId,
  setSelectedMoveZoneId,
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

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMoveZoneId || isLoading || isSubmitting}
              className={`rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 flex items-center gap-2 ${
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


