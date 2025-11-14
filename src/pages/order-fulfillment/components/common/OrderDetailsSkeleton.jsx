import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Order Items Skeleton */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton width={40} height={40} borderRadius={8} />
          <Skeleton height={24} width={200} />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <Skeleton width={64} height={64} borderRadius={8} />
              <div className="flex-1 space-y-2">
                <Skeleton height={18} width="60%" />
                <Skeleton height={14} width="40%" />
              </div>
              <div className="space-y-2">
                <Skeleton height={16} width={80} />
                <Skeleton height={16} width={80} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton width={40} height={40} borderRadius={8} />
              <Skeleton height={24} width={180} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j}>
                  <Skeleton height={14} width={100} style={{ marginBottom: 8 }} />
                  <Skeleton height={20} width="100%" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full Width Card Skeleton */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton width={40} height={40} borderRadius={8} />
          <Skeleton height={24} width={200} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton height={14} width={120} style={{ marginBottom: 8 }} />
              <Skeleton height={20} width="100%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

