import React from "react";

/**
 * Receipt Shipping Info Component
 * Displays shipping address and vendor information
 */
const ReceiptShippingInfo = ({ shippingAddress, vendor, company }) => {
  return (
    <div className="flex justify-between mb-10">
      {/* Shipping Address */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Shipping address:
        </h3>
        <div className="text-sm text-gray-900 leading-relaxed">
          <div className="font-medium">{shippingAddress?.name || ""}</div>
          <div>{shippingAddress?.country || ""}</div>
        </div>
      </div>

      {/* Vendor Information */}
      {/* <div className="text-sm text-gray-900 leading-relaxed">
        <div className="font-semibold mb-1">{vendor?.name || ""}</div>
        <div>
          {[vendor?.address?.country || "", vendor?.address?.zipCode || ""]
            .filter(Boolean)
            .join(", ")}
        </div>
        <div>{vendor?.address?.addressLine1 || ""}</div>
        <div>{vendor?.address?.city || ""}</div>
        <div>{vendor?.address?.province || ""}</div>
        {vendor?.phone && (
          <div className="mt-2 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span>{vendor.phone}</span>
          </div>
        )}
      </div> */}
      {/* Company Name and Address */}
      <div className="flex flex-col justify-end items-end text-end pt-2">
        <h1 className="text-xl font-semibold text-gray-900 mb-2 max-w-[250px]">
          {company?.name || "Company Name"}
        </h1>
        {company?.address && (
          <div className="text-sm text-gray-700 space-y-1 max-w-[250px]">
            <div>{company.address}</div>
          </div>
        )}
        {company?.phone && (
          <div className="text-sm text-gray-700 mt-2">{company.phone}</div>
        )}
      </div>
    </div>
  );
};

export default ReceiptShippingInfo;
