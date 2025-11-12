import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, title, value, change, changeType, color, delay = 0 }) {
  const isPositive = changeType === "increase";
  const changeColor = isPositive ? "text-green-600" : "text-red-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          {Icon && <Icon className={`w-6 h-6 ${color}`} />}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
            <span>{isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      {change !== undefined && (
        <p className="text-xs text-gray-500">
          {isPositive ? "Increase" : "Decrease"} from last period
        </p>
      )}
    </motion.div>
  );
}

