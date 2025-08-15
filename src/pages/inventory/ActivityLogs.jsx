import React from "react";

const ActivityLogs = () => {
  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-2 min-h-screen">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Activity Logs
              </h1>
              <p className="mt-2 text-gray-600">
                View and manage all activity logs related to inventory
                operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivityLogs;
