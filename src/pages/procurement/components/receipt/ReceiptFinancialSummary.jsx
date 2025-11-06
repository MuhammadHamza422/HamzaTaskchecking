import React from "react";
import { formatCurrency } from "./utils";

/**
 * Receipt Financial Summary Component
 * Displays untaxed amount and total
 */
const ReceiptFinancialSummary = ({
  financialSummary,
  currency,
  formatCurrency: formatCurrencyProp,
}) => {
  const formatCurrencyFn = formatCurrencyProp || formatCurrency;

  return (
    <div className="flex justify-end mb-10">
      <div className="w-96 text-sm">
        <div className="flex justify-between py-3 border-b-2 border-gray-300">
          <span className="text-gray-900 font-semibold text-base">
            Untaxed Amount
          </span>
          <span className="text-gray-900 font-semibold text-base">
            {formatCurrencyFn(
              financialSummary?.untaxedAmount || 0,
              currency
            )}
          </span>
        </div>
        <div className="flex justify-between py-4 mt-2">
          <span className="text-blue-600 font-bold text-xl">Total</span>
          <span className="text-blue-600 font-bold text-xl">
            {formatCurrencyFn(financialSummary?.total || 0, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReceiptFinancialSummary;

