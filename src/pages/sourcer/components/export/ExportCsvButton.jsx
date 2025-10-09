
import React from "react";

/** CSV utils */
const escapeCSV = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function ExportCsvButton({
  headers = [],      // string[]
  rows = [],         // array<array<string|number>>
  filename = "export.csv",
  className = "",
  children = "Export CSV",
}) {
  const handleExport = () => {
    if (!headers.length) return;

    // Build CSV
    const csvHeader = headers.map(escapeCSV).join(",");
    const csvRows = rows.map((r) => r.map(escapeCSV).join(","));
    const csv = [csvHeader, ...csvRows].join("\n");

    // Add BOM for Excel and download
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={[
        "inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium",
        "text-white bg-[#b74d00] hover:bg-[#9f4200] active:bg-[#853700]",
        "shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-orange-300",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
