import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function MobileCardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 mb-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <Skeleton height={20} width={150} style={{ marginBottom: 8 }} />
              <Skeleton height={16} width={120} style={{ marginBottom: 8 }} />
              <Skeleton height={24} width={80} />
            </div>
            <Skeleton height={24} width={80} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton height={12} width={60} style={{ marginBottom: 4 }} />
                <Skeleton height={16} width={80} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

