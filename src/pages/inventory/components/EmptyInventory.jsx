import { FiPackage, FiPlus } from 'react-icons/fi';

export default function EmptyInventory({ onAddNew }) {
  return (
    <div className="bg-white rounded-lg border p-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="bg-blue-50 p-3 rounded-full mb-4">
          <FiPackage className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Inventory Found
        </h3>
        <p className="text-gray-500 max-w-sm mb-6">
          There are no inventory items in this warehouse yet. Start by adding products to locations.
        </p>
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiPlus className="mr-2 -ml-1 h-5 w-5" />
            Add Inventory
          </button>
        )}
      </div>
    </div>
  );
}