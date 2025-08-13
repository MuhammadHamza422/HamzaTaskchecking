import { Package, MapPin, Calendar, Hash, Barcode, QrCode } from "lucide-react"



export default function InventoryDisplay({ items, totalCount, isLoading }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLocationTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case "bin":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "shelf":
        return "bg-green-100 text-green-800 border-green-200"
      case "warehouse":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getQuantityStatus = (quantity) => {
    if (quantity === 0) return { color: "bg-red-100 text-red-800 border-red-200", status: "Out of Stock" }
    if (quantity <= 5) return { color: "bg-orange-100 text-orange-800 border-orange-200", status: "Low Stock" }
    if (quantity <= 20) return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", status: "Medium Stock" }
    return { color: "bg-emerald-100 text-emerald-800 border-emerald-200", status: "In Stock" }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
        <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600 mb-2">No inventory found</h3>
        <p className="text-slate-500">Try adjusting your search criteria</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inventory Results</h2>
            <p className="text-sm text-slate-500">
              {totalCount ? `${totalCount} total items` : `${items.length} items found`}
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Items */}
      <div className="space-y-4">
        {items.map((item) => {
          const quantityStatus = getQuantityStatus(item.quantity)

          return (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Product Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl flex items-center justify-center">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Product Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{item.productData.pro_title}</h3>

                    {/* Product Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Barcode className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">SKU:</span>
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{item.productData.sku}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Hash className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">Model:</span>
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">
                          {item.productData.model_code}
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${quantityStatus.color}`}>
                        {item.quantity} units • {quantityStatus.status}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLocationTypeColor(item.locationData.type)}`}
                      >
                        {item.locationData.type.toUpperCase()} • {item.locationData.code}
                      </span>
                    </div>

                    {/* Location & QR Code */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">Location</span>
                        </div>
                        <span className="text-sm font-mono text-slate-600">{item.locationData.code}</span>
                      </div>

                      {item.locationData.qrcode && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">QR Code</span>
                          </div>
                          <a
                            href={item.locationData.qrcode}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            View QR Code
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {formatDate(item.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Updated: {formatDate(item.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Badge */}
                  <div className="flex-shrink-0">
                    <div className={`px-4 py-2 rounded-xl border-2 ${quantityStatus.color}`}>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{item.quantity}</div>
                        <div className="text-xs font-medium">units</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
