import React from "react";
import { FiDownload, FiSearch } from "react-icons/fi";
import { CSVLink } from "react-csv";

export default function InventoryHeader({
  zoneName,
  searchTerm,
  setSearchTerm,
  warehouseType,
  onAddNew,
  isAddDisabled,
  addButtonLabel,
  csvData,
  csvHeaders,
  csvFilename = "inventory.csv",
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory of {zoneName}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View and manage stock items.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end gap-3">
          <CSVLink
            data={csvData || []}
            headers={csvHeaders || []}
            filename={csvFilename}
            className="max-md:w-full flex items-center max-md:justify-center gap-2 px-5 py-2 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
          >
            <p className="text-sm font-bold uppercase">EXPORT</p>
            <FiDownload className="text-sm" />
          </CSVLink>
          {warehouseType === "not_shelf" && (
            <button
              onClick={onAddNew}
              disabled={isAddDisabled}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-60"
            >
              {addButtonLabel}
            </button>
          )}
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, location, or warehouse…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none duration-300 ease-in-out"
          />
        </div>
      </div>
    </div>
  );
}
