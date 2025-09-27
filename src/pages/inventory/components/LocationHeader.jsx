import { FiArrowLeft, FiPlus, FiDownload, FiPrinter } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setSelectedZoneId } from "../../../store/appSlice.js";

export default function LocationHeader({
  warehouseName = "",
  zoneName = "",
  zoneId = "",
  warehouseId = "",
  locations = [],
  role = "",
  onOpenNew,
  onOpenPrint,
  onImportCSV,
  uploading = false,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center gap-y-4 justify-between">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/inventory/warehouses")}
            className="flex items-center space-x-1 hover:underline"
          >
            <FiArrowLeft /> <span>Warehouses</span>
          </button>
          <span>/</span>
          <span
            onClick={() => navigate("/inventory/warehouses")}
            className="cursor-pointer hover:underline"
          >
            {warehouseName}
          </span>
          <span>/</span>
          {zoneName && (
            <>
              <span
                onClick={() => {
                  dispatch(setSelectedZoneId(zoneId));
                  navigate("/inventory/zones");
                }}
                className="cursor-pointer hover:underline"
              >
                {zoneName}
              </span>
              <span>/</span>
            </>
          )}
          <span className="font-semibold">Locations</span>
        </nav>
        {Array.isArray(locations) && locations.length > 0 && (
          <button
            onClick={onOpenPrint}
            title="Print"
            aria-label="Print"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiPrinter className="w-5 h-5" />
            Print labels
          </button>
        )}
      </div>

      {/* Header + New */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">
          Locations {zoneName ? `of ${zoneName}` : ""}
        </h1>
        {role !== "Technician" && role !== "Picker" && (
          <div className="flex gap-2">
            <button
              onClick={onImportCSV}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiDownload className="mr-2" />
              {uploading ? "Uploading..." : "Import CSV"}
            </button>
            <button
              onClick={onOpenNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus /> <span>New Location</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
