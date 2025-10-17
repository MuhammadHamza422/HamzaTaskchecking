
// src/pages/purchaser/components/PurchaserFilters.jsx
import React from "react";
import { Row, Col, Select, Input, DatePicker } from "antd";

const { Option } = Select;
const { Search } = Input;

export default function PurchaserFilters({
  screens,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  AdminScopeControl,
  onClear,
  showStatusNote = "",
}) {
  return (
    <div
      className="
        rounded-xl p-5 mb-4 shadow-md
        border border-sky-200
        bg-gradient-to-b from-[rgb(219,234,254)] to-[rgb(191,219,254)]
        transition-all duration-200 hover:shadow-lg
      "
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h4 className="m-0 text-slate-800 font-semibold text-base tracking-tight">
          Filters{" "}
          {showStatusNote && (
            <span className="text-slate-600 font-normal">· {showStatusNote}</span>
          )}
        </h4>

        <div className="flex gap-2 items-center">
          {AdminScopeControl}
          <button
            onClick={onClear}
            className="
              sm:w-auto w-full flex min-w-fit text-sm sm:text-base
              items-center justify-center gap-2 px-4 py-1.5
              bg-rose-500 text-white rounded-lg
              hover:bg-rose-600 transition-colors duration-150 shadow-sm
            "
          >
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <Row gutter={[8, 8]}>
        <Col xs={24} sm={12} md={6} lg={5}>
          <Select
            placeholder="Status"
            style={{ width: "100%" }}
            onChange={(value) => setStatusFilter(value || "")}
            allowClear
            value={statusFilter || undefined}
            size={screens.xs ? "middle" : "large"}
            className="bg-white/90 text-slate-800 rounded-md"
            dropdownStyle={{
              background: "white",
            }}
          >
            {[
              "Assigned",
              "Offer",
              "Purchased",
              "Disapproved",
              "Sold",
              "Hold",
              "Seller Rejected",
              "Dropshipped",
              "Returned",
            ].map((status) => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12} md={8} lg={7}>
          <Search
            placeholder="Search product/SKU/seller/sourcer/id"
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            style={{ width: "100%" }}
            size={screens.xs ? "middle" : "large"}
            className="bg-white/90 text-slate-800 rounded-md"
          />
        </Col>

        <Col xs={24} sm={24} md={10} lg={8}>
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            onChange={(dates) => setDateRange(dates ?? [])}
            value={dateRange}
            size={screens.xs ? "middle" : "large"}
            className="bg-white/90 text-slate-800 rounded-md"
          />
        </Col>
      </Row>
    </div>
  );
}
