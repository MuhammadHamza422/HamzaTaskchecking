import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function QuickActionCard({ icon: Icon, title, description, path, color }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className="bg-white rounded-lg border-2 border-gray-200 p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-300 group"
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${color} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform`}>
        {Icon && <Icon className={`w-6 h-6 ${color}`} />}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.div>
  );
}

