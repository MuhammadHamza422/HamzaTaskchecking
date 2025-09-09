import React from "react";
import { FiArrowLeft } from "react-icons/fi";

export default function InventoryBreadcrumb({ navigate, warehouseName, zoneName }) {
  return (
    <nav className="text-sm text-gray-600 flex items-center space-x-2 py-4">
      <button
        onClick={() => navigate("/inventory/warehouses")}
        className="flex items-center space-x-1 hover:underline"
      >
        <FiArrowLeft /> <span>Warehouses</span>
      </button>
      <span>/</span>

      {warehouseName && (
        <>
          <span
            onClick={() => navigate("/inventory/warehouses")}
            className="cursor-pointer hover:underline"
          >
            {warehouseName}
          </span>
          <span>/</span>
        </>
      )}
      {zoneName && (
        <>
          <span
            onClick={() => {
              navigate("/inventory/zones");
            }}
            className="cursor-pointer hover:underline"
          >
            {zoneName}
          </span>
          <span>/</span>
        </>
      )}
      <span className="font-medium">Inventory</span>
    </nav>
  );
}


