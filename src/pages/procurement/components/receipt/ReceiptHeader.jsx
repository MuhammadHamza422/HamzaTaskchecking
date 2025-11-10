import React from "react";

const ReceiptHeader = ({ company }) => {
  // Use dynamic logo from API response, fallback to static logo
  const logoUrl = company?.logo || "/Retro vGame_logo.png";
  const logoAlt = company?.name ? `${company.name} Logo` : "Retro vGame Logo";

  return (
    <div className="mb-4">
      <div className="flex items-start gap-4 mb-4">
        {/* Logo Container */}
        <div className="rounded w-[150px] h-auto flex flex-col items-center justify-center p-2 shrink-0">
          <img
            src={logoUrl}
            alt={logoAlt}
            className="object-contain max-w-[150px] max-h-[150px]"
            onError={(e) => {
              // Fallback to static logo if dynamic logo fails to load
              if (e.target.src !== "/Retro vGame_logo.png") {
                e.target.src = "/Retro vGame_logo.png";
              }
            }}
          />
        </div>

        {/* Company Name and Address */}
        {/* <div className="flex-1 pt-2">
          <h1 className="text-[22px] font-bold text-gray-900 mb-2">
            {company?.name || "Company Name"}
          </h1>
          {company?.address && (
            <div className="text-sm text-gray-700 space-y-1">
              {typeof company.address === "string" ? (
                <div>{company.address}</div>
              ) : (
                <>
                  {company.address.addressLine1 && (
                    <div>{company.address.addressLine1}</div>
                  )}
                  {company.address.addressLine2 && (
                    <div>{company.address.addressLine2}</div>
                  )}
                  <div>
                    {[
                      company.address.city,
                      company.address.state,
                      company.address.zipCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {company.address.country && (
                    <div>{company.address.country}</div>
                  )}
                </>
              )}
            </div>
          )}
          {company?.phone && (
            <div className="text-sm text-gray-700 mt-2">
              Phone: {company.phone}
            </div>
          )}
          {company?.email && (
            <div className="text-sm text-gray-700">Email: {company.email}</div>
          )}
          {company?.website && (
            <div className="text-sm text-gray-700">
              Website: {company.website}
            </div>
          )}
          {company?.contactPerson && (
            <div className="text-sm text-gray-700 mt-2">
              Contact: {company.contactPerson}
              {company.contactPersonPhone && ` - ${company.contactPersonPhone}`}
              {company.contactPersonEmail && ` (${company.contactPersonEmail})`}
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default ReceiptHeader;
