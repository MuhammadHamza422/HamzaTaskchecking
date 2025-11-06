import React, { useMemo } from "react";
import ReceiptLineItemRow from "./ReceiptLineItemRow";
import { formatCurrency } from "./utils";

/**
 * Receipt Line Items Table Component
 * Displays all line items using the new allLineItems array or falls back to old structure
 */
const ReceiptLineItemsTable = ({
  allLineItems,
  boxesSummary,
  looseLineItems,
  lineItems,
  currency,
  formatCurrency: formatCurrencyProp,
}) => {
  const formatCurrencyFn = formatCurrencyProp || formatCurrency;

  // Debug logging
  React.useEffect(() => {
    console.log("=== ReceiptLineItemsTable Debug ===");
    console.log("allLineItems:", allLineItems);
    console.log("allLineItems type:", typeof allLineItems);
    console.log("allLineItems isArray:", Array.isArray(allLineItems));
    console.log("allLineItems length:", allLineItems?.length);
    console.log("boxesSummary:", boxesSummary);
    console.log("boxesSummary.boxes:", boxesSummary?.boxes);
    console.log("looseLineItems:", looseLineItems);
    console.log("looseLineItems length:", looseLineItems?.length);
    console.log("lineItems:", lineItems);
    console.log("lineItems length:", lineItems?.length);
    console.log("================================");
  }, [allLineItems, boxesSummary, looseLineItems, lineItems]);

  // Group items by box for rendering
  const groupedItems = useMemo(() => {
    console.log("groupedItems useMemo - allLineItems:", allLineItems);
    
    if (!allLineItems || !Array.isArray(allLineItems) || allLineItems.length === 0) {
      console.log("groupedItems useMemo - returning null (no allLineItems)");
      return null;
    }

    console.log("groupedItems useMemo - processing", allLineItems.length, "items");

    // First, separate loose items and box items
    const looseItems = [];
    const boxItemsMap = new Map(); // Map<boxId, { boxId, boxName, items: [] }>

    allLineItems.forEach((item, index) => {
      const itemBoxId = item.boxId || null;
      const itemBoxName = item.boxName || null;
      const isLoose = item.source === "loose" || !itemBoxId;

      console.log(`Processing item ${index}:`, {
        name: item.name,
        source: item.source,
        boxId: itemBoxId,
        isLoose
      });

      if (isLoose) {
        looseItems.push(item);
        console.log(`Added to looseItems. Total loose items: ${looseItems.length}`);
      } else {
        // Group by boxId
        if (!boxItemsMap.has(itemBoxId)) {
          boxItemsMap.set(itemBoxId, {
            boxId: itemBoxId,
            boxName: itemBoxName,
            items: [],
          });
          console.log(`Created new box group for boxId: ${itemBoxId}`);
        }
        boxItemsMap.get(itemBoxId).items.push(item);
        console.log(`Added to box ${itemBoxId}. Items in box: ${boxItemsMap.get(itemBoxId).items.length}`);
      }
    });

    console.log("After processing - looseItems count:", looseItems.length);
    console.log("After processing - boxItemsMap size:", boxItemsMap.size);
    boxItemsMap.forEach((value, key) => {
      console.log(`Box ${key} has ${value.items.length} items`);
    });

    // Build groups array: boxes first, then loose items
    const groups = [];

    // Add box groups (sorted by boxId for consistent ordering)
    const boxEntries = Array.from(boxItemsMap.entries()).sort((a, b) => {
      // Sort by boxId for consistent ordering
      return (a[0] || "").localeCompare(b[0] || "");
    });

    boxEntries.forEach(([boxId, boxData], index) => {
      groups.push({
        type: "box",
        boxId: boxData.boxId,
        boxName: boxData.boxName,
        boxIndex: index + 1,
        items: boxData.items,
      });
    });

    // Add loose items group at the end (if any)
    if (looseItems.length > 0) {
      groups.push({
        type: "loose",
        boxId: null,
        boxName: null,
        items: looseItems,
      });
    }

    const result = groups.length > 0 ? groups : null;
    console.log("groupedItems useMemo - result:", result);
    console.log("groupedItems useMemo - groups details:", groups.map(g => ({
      type: g.type,
      boxId: g.boxId,
      boxName: g.boxName,
      itemsCount: g.items?.length || 0,
      items: g.items
    })));
    return result;
  }, [allLineItems]);

  // Fallback: Use old structure if allLineItems is not available
  const hasBoxes =
    boxesSummary?.boxes &&
    Array.isArray(boxesSummary.boxes) &&
    boxesSummary.boxes.length > 0;

  const hasLooseItems =
    looseLineItems &&
    Array.isArray(looseLineItems) &&
    looseLineItems.length > 0;

  const hasLineItems =
    lineItems && Array.isArray(lineItems) && lineItems.length > 0;

  console.log("Rendering decision:", {
    hasGroupedItems: groupedItems && groupedItems.length > 0,
    groupedItemsLength: groupedItems?.length,
    hasBoxes,
    hasLooseItems,
    hasLineItems,
  });

  // Use new structure if available
  if (groupedItems && groupedItems.length > 0) {
    console.log("Rendering with allLineItems (new structure)");
    console.log("groupedItems details:", groupedItems);
    const hasAnyItems = groupedItems.some(group => group.items && group.items.length > 0);
    console.log("hasAnyItems:", hasAnyItems);
    console.log("groupedItems with items:", groupedItems.filter(g => g.items && g.items.length > 0));
    
    return (
      <div 
        className="mb-10"
        style={{
          display: "block",
          width: "100%",
          overflow: "visible",
          visibility: "visible",
          position: "relative",
          zIndex: 1,
        }}
      >
        <table 
          className="w-full border-collapse text-sm"
          style={{
            display: "table",
            width: "100%",
            tableLayout: "auto",
            borderCollapse: "collapse",
            visibility: "visible",
            opacity: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          <thead style={{ display: "table-header-group" }}>
            <tr className="border-b border-gray-400 bg-gray-50">
              <th className="text-left py-3 px-4 font-bold text-gray-900">
                Description
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Qty
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                Unit Price
              </th>
              {/* <th className="text-right py-3 px-4 font-bold text-gray-900">
                Disc.
              </th>
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Taxes
              </th> */}
              <th className="text-right py-3 px-4 font-bold text-gray-900">
                Amount
              </th>
            </tr>
          </thead>
          <tbody style={{ display: "table-row-group" }}>
            {hasAnyItems ? (
              groupedItems
                .filter(group => group.items && group.items.length > 0)
                .map((group, groupIndex) => {
                  console.log("Rendering group:", group.type, "with", group.items.length, "items", group);
                  return (
                    <React.Fragment key={group.type === "box" ? group.boxId : `loose-${groupIndex}`}>
                      {/* Group Header Row */}
                      <tr 
                        className="bg-gray-100 border-b border-gray-300"
                        style={{
                          display: "table-row",
                          visibility: "visible",
                          opacity: 1,
                        }}
                      >
                        <td
                          colSpan={6}
                          className="py-2 px-4 font-bold text-gray-900"
                          style={{
                            display: "table-cell",
                            visibility: "visible",
                            padding: "8px 16px",
                          }}
                        >
                          {group.type === "box"
                            ? group.boxName
                              ? `Box # ${group.boxIndex}: ${group.boxName}`
                              : `Box # ${group.boxIndex}`
                            : "Loose Items"}
                        </td>
                      </tr>

                      {/* Group Items */}
                      {group.items.map((item, itemIndex) => {
                        console.log("Rendering item:", item.name, item);
                        return (
                          <ReceiptLineItemRow
                            key={`${group.type === "box" ? group.boxId : "loose"}-${itemIndex}-${item.productId || itemIndex}`}
                            item={item}
                            currency={currency}
                            formatCurrency={formatCurrencyFn}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback to old structure
  console.log("Rendering with fallback structure (old)");
  return (
    <div className="mb-10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-400 bg-gray-50">
            <th className="text-left py-3 px-4 font-bold text-gray-900">
              Description
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-900">
              Qty
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
              Unit Price
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-900">
              Disc.
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-900">
              Taxes
            </th>
            <th className="text-right py-3 px-4 font-bold text-gray-900">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Render Boxes with their items */}
          {hasBoxes &&
            boxesSummary.boxes.map((box, boxIndex) => (
              <React.Fragment key={box.boxId || boxIndex}>
                {/* Box Header Row */}
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <td
                    colSpan={6}
                    className="py-2 px-4 font-bold text-gray-900"
                  >
                    {box.name
                      ? `Box # ${boxIndex + 1}: ${box.name}`
                      : `Box # ${boxIndex + 1}`}
                  </td>
                </tr>

                {/* Box Items */}
                {box.boxLineItems &&
                Array.isArray(box.boxLineItems) &&
                box.boxLineItems.length > 0
                  ? box.boxLineItems.map((item, itemIndex) => (
                      <ReceiptLineItemRow
                        key={`${box.boxId || boxIndex}-item-${itemIndex}`}
                        item={item}
                        currency={currency}
                        formatCurrency={formatCurrencyFn}
                      />
                    ))
                  : null}
              </React.Fragment>
            ))}

          {/* Render Loose Items (if any) */}
          {hasLooseItems && (
            <>
              {/* Loose Items Header Row */}
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <td
                  colSpan={6}
                  className="py-2 px-4 font-bold text-gray-900"
                >
                  Loose Items
                </td>
              </tr>
              {/* Loose Items */}
              {looseLineItems.map((item, index) => (
                <ReceiptLineItemRow
                  key={`loose-${index}`}
                  item={item}
                  currency={currency}
                  formatCurrency={formatCurrencyFn}
                />
              ))}
            </>
          )}

          {/* Fallback: If no boxes and no loose items, show old lineItems or empty state */}
          {!hasBoxes && !hasLooseItems && (
            <>
              {hasLineItems ? (
                lineItems.map((item, index) => (
                  <ReceiptLineItemRow
                    key={`line-${index}`}
                    item={item}
                    currency={currency}
                    formatCurrency={formatCurrencyFn}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-500"
                  >
                    No items found
                  </td>
                </tr>
              )}
            </>
          )}

          {/* Show empty state if nothing was rendered */}
          {!hasBoxes && !hasLooseItems && !hasLineItems && (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-gray-500"
              >
                No items found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptLineItemsTable;

