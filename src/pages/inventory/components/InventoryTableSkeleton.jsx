import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function InventoryTableSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((group) => (
        <div key={group} className="overflow-hidden rounded-lg border">
          <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200">
            <Skeleton width={120} height={24} />
            <Skeleton width={80} height={20} />
          </div>
          <div className="bg-white">
            <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-gray-50">
              <Skeleton width={200} height={20} />
              <Skeleton width={100} height={20} />
              <Skeleton width={150} height={20} />
              <Skeleton width={80} height={20} />
            </div>
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="grid grid-cols-4 gap-4 px-4 py-3 border-t"
              >
                <Skeleton width={250} height={20} />
                <Skeleton width={120} height={20} />
                <Skeleton width={180} height={20} />
                <Skeleton width={60} height={20} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}