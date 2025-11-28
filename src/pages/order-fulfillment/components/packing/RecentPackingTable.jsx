import { Table } from "antd";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import dayjs from "dayjs";

export default function RecentPackingTable({ data = [], loading = false }) {
  const navigate = useNavigate();

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => (
        <span className="font-semibold text-gray-900 text-sm">{text}</span>
      ),
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) => (
        <PlatformBadge
          platform={platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : platform}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Items Packed",
      dataIndex: "selectedItemsCount",
      key: "selectedItemsCount",
      render: (count) => (
        <span className="text-sm text-gray-700 font-medium">{count || 0}</span>
      ),
    },
    {
      title: "Packed By",
      dataIndex: "packedBy",
      key: "packedBy",
      render: (name) => <span className="text-sm text-gray-700">{name || "N/A"}</span>,
    },
    {
      title: "Packed At",
      dataIndex: "packedAt",
      key: "packedAt",
      render: (date) => (
        <span className="text-sm text-gray-600">
          {date ? dayjs(date).format("MMM DD, YYYY HH:mm") : "N/A"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading recent packing operations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden"
    >
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Fulfillment Operations
            </h3>
            <p className="text-sm text-gray-600">
              Latest {data.length} fulfillment operations
            </p>
          </div>
          <button
            onClick={() => navigate("/fulfillment/packing/list")}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-300"
          >
            View All →
          </button>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500 text-sm">No recent packing operations found</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="packingId"
              pagination={false}
              onRow={(record) => ({
                onClick: () =>
                  navigate(`/fulfillment/packing/${record.orderNumber}`, {
                    state: { packingId: record.packingId },
                  }),
                className: "cursor-pointer hover:bg-blue-50 transition-colors",
              })}
              className="fulfillment-table"
            />
          </div>

          <div className="md:hidden p-4 space-y-4">
            {data.map((record) => (
              <motion.div
                key={record.packingId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() =>
                  navigate(`/fulfillment/packing/${record.orderNumber}`, {
                    state: { packingId: record.packingId },
                  })
                }
                className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base mb-1">
                      {record.orderNumber}
                    </h3>
                    <PlatformBadge
                      platform={record.platform ? record.platform.charAt(0).toUpperCase() + record.platform.slice(1) : record.platform}
                    />
                  </div>
                  <StatusBadge status={record.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Items Packed</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {record.selectedItemsCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Packed By</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {record.packedBy || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Packed At</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {record.packedAt ? dayjs(record.packedAt).format("MMM DD, YYYY HH:mm") : "N/A"}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
