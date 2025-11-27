import { DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderFinancialsCard({ 
  currency = "USD", 
  subtotal = 0, 
  tax = 0, 
  shipping = 0, 
  discount = 0, 
  totalValue = 0,
  delay = 0.4 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-emerald-50 rounded-xl border-2 border-emerald-100 shadow-lg p-3 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <DollarSign className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Order Financials</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <p className="text-xs font-medium text-gray-500">Subtotal</p>
          <p className="text-sm font-semibold text-gray-900">
            {currency} {subtotal.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between">
          <p className="text-xs font-medium text-gray-500">Tax</p>
          <p className="text-sm font-semibold text-gray-900">
            {currency} {tax.toFixed(2)}
          </p>
        </div>
        <div className="flex justify-between">
          <p className="text-xs font-medium text-gray-500">Shipping</p>
          <p className="text-sm font-semibold text-gray-900">
            {currency} {shipping.toFixed(2)}
          </p>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <p className="text-xs font-medium text-gray-500">Discount</p>
            <p className="text-sm font-semibold text-red-600">
              -{currency} {discount.toFixed(2)}
            </p>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-900">Total</p>
          <p className="text-base font-bold text-blue-600">
            {currency} {totalValue.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

