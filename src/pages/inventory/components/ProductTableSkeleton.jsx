import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function ProductTableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="px-6 py-4 whitespace-nowrap">
              <Skeleton height={16} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}


