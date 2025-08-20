export default function LocationSearch({
  searchQuery = "",
  onSearchChange,
  onClearSearch,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search locations by code..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
          />
        </div>
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
