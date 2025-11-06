import dayjs from "dayjs";

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
  if (!amount && amount !== 0) {
    if (currency === "JPY") return "¥0";
    return "$0.00";
  }

  // JPY doesn't use decimal places
  if (currency === "JPY") {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date from ISO string
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date (MM/DD/YYYY)
 */
export const formatDate = (isoString) => {
  if (!isoString) return "-";
  return dayjs(isoString).format("MM/DD/YYYY");
};

