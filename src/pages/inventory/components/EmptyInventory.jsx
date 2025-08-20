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
      </div>
    </div>
  );
}