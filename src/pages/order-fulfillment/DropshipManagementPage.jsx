import DropshipManagementTable from "./components/dropship/DropshipManagementTable";

export default function DropshipManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-6">
        {/* <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Drop-ship Management
          </h1>
          <p className="text-gray-600">
            Manage orders with unselected items for drop-ship processing
          </p>
        </div> */}
        <DropshipManagementTable />
      </div>
    </div>
  );
}

