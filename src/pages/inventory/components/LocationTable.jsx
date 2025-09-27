import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const LocationSkeleton = () => (
  <tr>
    <td className="px-4 py-3">
      <Skeleton width={20} height={20} circle />
    </td>
    <td className="px-4 py-3 text-center">
      <Skeleton width={40} height={40} />
    </td>
    <td className="px-4 py-3">
      <Skeleton width={120} height={16} />
    </td>
    <td className="px-4 py-3">
      <span className="inline-block">
        <Skeleton width={60} height={20} />
      </span>
    </td>
    <td className="px-4 py-3 text-right">
      <Skeleton width={28} height={28} circle />
    </td>
  </tr>
);

export default function LocationTable({
  locations = [],
  isLoading = false,
  error = null,
  selectedIds = new Set(),
  onToggleSelected,
  onSelectAll,
  onEditLocation,
  sortField = "code",
  sortOrder = "asc",
  onSort,
  role,
  onOpenNew,
}) {
  const isAllSelected =
    locations.length > 0 && selectedIds.size === locations.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < locations.length;

  const locationTypeColors = {
    shelf: "text-green-600 bg-green-50",
    bin: "text-purple-600 bg-purple-50",
    box: "text-orange-600 bg-orange-50",
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return "⇅"; // Neutral icon
    }
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleRowClick = (id) => {
    onToggleSelected(id);
  };

  if (isLoading) {
    return (
      <div className="p-4 w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  disabled
                />
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-600">
                QR Code
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                Code
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                Type
              </th>
              <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <LocationSkeleton />
            <LocationSkeleton />
            <LocationSkeleton />
          </tbody>
        </table>
      </div>
    );
  }

  if (locations.length === 0 && !error) {
    return (
      <div className="py-12 text-center">
        <div className="bg-blue-50 p-4 rounded-full mx-auto mb-4 w-fit">
          <svg
            className="w-8 h-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Locations Yet
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-6">
          Start by adding your first location to organize and track your
          inventory.
        </p>
        {role !== "Technician" && role !== "Picker" && (
          <button
            onClick={onOpenNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <svg
              className="mr-2 -ml-1 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add First Location
          </button>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="bg-red-50 p-4 rounded-full mx-auto mb-4 w-fit">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Locations
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto mb-6">
          {error.message || "Failed to load locations. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          <svg
            className="mr-2 -ml-1 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isIndeterminate;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
            QR Code
          </th>
          <th
            className={`px-4 py-2 text-left text-sm font-semibold cursor-pointer transition-colors select-none ${
              sortField === "code"
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => onSort("code")}
          >
            <div className="flex items-center gap-1">
              Code
              <span className="text-xs">{getSortIcon("code")}</span>
            </div>
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
            Type
          </th>
          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {locations.map((loc) => (
          <tr
            key={String(loc.id || loc.code)}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleRowClick(loc.id)}
          >
            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600 cursor-pointer"
                checked={selectedIds.has(loc.id)}
                onChange={() => onToggleSelected(loc.id)}
              />
            </td>
            <td className="px-4 py-2 flex items-center justify-start">
              <QRCodeSVG
                value={String(loc?.code || "")}
                size={40}
                level="M"
                includeMargin
              />
            </td>
            <td className="px-4 py-2 font-medium text-gray-900">{loc?.code}</td>
            <td className="px-4 py-2">
              <span
                className={`inline-block uppercase px-2 py-0.5 text-sm font-medium rounded-full ${
                  locationTypeColors[loc?.type] || "text-gray-600 bg-gray-100"
                }`}
              >
                {loc?.type}
              </span>
            </td>

            <td
              className="px-4 py-2 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onEditLocation(loc)}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                title="Edit"
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
