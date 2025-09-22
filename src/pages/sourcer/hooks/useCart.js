import { useMemo, useReducer } from "react";

const reducer = (state, action) => {
  switch (action.type) {
    case "add":
      if (state.items.some((i) => i.id === action.item.id)) return state;
      return { items: [...state.items, action.item] };
    case "remove":
      return { items: state.items.filter((i) => i.id !== action.id) };
    case "update":
      return { items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
    case "reset":
      return { items: [] };
    default:
      return state;
  }
};

export default function useCart(totals) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  const efficiency = useMemo(() => {
    const actual =
      (totals?.sellers_price || 0) + (totals?.shipping_price || 0) + (totals?.tax || 0);
    const target = state.items.reduce(
      (acc, it) => acc + (it.target_cost_per_unit || 0) * (it.quantity_needed || 0),
      0
    );
    return target - actual;
  }, [state.items, totals]);

  const proratedItems = useMemo(() => {
    const actual =
      (totals?.sellers_price || 0) + (totals?.shipping_price || 0) + (totals?.tax || 0);
    const target = state.items.reduce(
      (acc, it) => acc + (it.target_cost_per_unit || 0) * (it.quantity_needed || 0),
      0
    );
    const ratio = target > 0 ? actual / target : 0;
    return state.items.map((i) => ({
      ...i,
      sourced_price: (i.target_cost_per_unit || 0) * ratio,
    }));
  }, [state.items, totals]);

  return {
    items: proratedItems,
    rawItems: state.items,
    efficiency,
    add: (item) => dispatch({ type: "add", item }),
    remove: (id) => dispatch({ type: "remove", id }),
    update: (id, patch) => dispatch({ type: "update", id, patch }),
    reset: () => dispatch({ type: "reset" }),
  };
}
