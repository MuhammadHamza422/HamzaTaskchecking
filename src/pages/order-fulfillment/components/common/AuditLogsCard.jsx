import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";

export default function AuditLogsCard({ auditLogs = [], delay = 0.7 }) {
  if (!auditLogs || auditLogs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 shadow-lg p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Clock className="w-5 h-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
      </div>
      <div className="space-y-3">
        {auditLogs.map((log, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {log.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-500">
                  {dayjs(log.timestamp).format("MMM DD, YYYY HH:mm")}
                </p>
              </div>
              <p className="text-xs text-gray-600">
                By: {log.performedBy?.name || "N/A"} ({log.performedBy?.email || "N/A"})
              </p>
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

