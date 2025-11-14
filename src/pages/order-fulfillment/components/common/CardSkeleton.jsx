import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function CardSkeleton({ rows = 3 }) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton width={40} height={40} borderRadius={8} />
        <Skeleton height={24} width={200} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton height={14} width={100} style={{ marginBottom: 8 }} />
            <Skeleton height={20} width="100%" />
          </div>
        ))}
      </div>
    </div>
  );
}

