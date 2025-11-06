import React from "react";
import { formatCurrency } from "./utils";

/**
 * Receipt Line Item Row Component
 * Renders a single line item row in the table
 */
const ReceiptLineItemRow = ({ item, currency, formatCurrency: formatCurrencyProp }) => {
  const formatCurrencyFn = formatCurrencyProp || formatCurrency;

  return (
    <tr 
      className="border-b border-gray-300"
      style={{
        display: "table-row",
        visibility: "visible",
        opacity: 1,
      }}
    >
      <td 
        className="py-3 px-4 text-gray-900"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        <div className="font-medium">{item.name || "-"}</div>
        {item.type === "kit" &&
          item.components &&
          item.components.length > 0 && (
            <div className="text-xs text-gray-600 mt-1 italic">
              Components:{" "}
              {item.components.map((comp, i) => (
                <span key={i}>
                  {comp.name} x{comp.quantity}
                  {i < item.components.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        {/* {item.sku && (
          <div className="text-xs text-gray-500 mt-1">SKU: {item.sku}</div>
        )} */}
      </td>
      <td 
        className="py-3 px-4 text-right text-gray-900 whitespace-nowrap"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        {item.quantity?.toLocaleString() || 0} {item.uom || ""}
      </td>
      <td 
        className="py-3 px-4 text-right text-gray-900"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        {formatCurrencyFn(item.unitPrice || 0, currency)}
      </td>
      {/* <td 
        className="py-3 px-4 text-right text-gray-900"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        {typeof item.discount === "number"
          ? item.discount.toFixed(2)
          : "0.00"}
        %
      </td> */}
      {/* <td 
        className="py-3 px-4 text-right text-gray-900"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        {item.taxes ? formatCurrencyFn(item.taxes, currency) : "-"}
      </td> */}
      <td 
        className="py-3 px-4 text-right text-gray-900 font-semibold"
        style={{
          display: "table-cell",
          visibility: "visible",
          padding: "12px 16px",
        }}
      >
        {formatCurrencyFn(item.totalAmount || item.amount || 0, currency)}
      </td>
    </tr>
  );
};

export default ReceiptLineItemRow;

