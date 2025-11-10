import React from "react";

/**
 * Terms and Conditions Component
 * Static content that appears after the table
 */
const TermsAndConditions = () => {
  return (
    <>
    <div className="mt-10 text-xs text-gray-900 space-y-5 pt-4" style={{ pageBreakInside: "avoid" }}>
      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Quality Standards
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>Refurbished Items:</strong> All items must meet the required
          specifications outlined in the purchase order, ensuring they are
          defect-free and fully functional.
        </p>
        <p className="mb-2 text-gray-900">
          <strong>1.2 Adherence to Retro VGames Standards:</strong>
        </p>
        <p className="mb-2 text-gray-900">
          Refurbished items must meet the following criteria:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Complete functionality testing (graphics, audio, and connectivity)
          </li>
          <li>Professional repair of defects.</li>
          <li>
            Aesthetic restoration to a near-new condition (removal of stickers,
            scratches, etc.).
          </li>
          <li>
            Update to the latest North American/English firmware version and
            factory reset where applicable.
          </li>
        </ul>
        </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Packaging Requirements
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>2.1 Secure Packaging:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            All items must be packaged securely to prevent damage during transit.
          </li>
          <li>
            Use durable materials, such as bubble wrap and sturdy boxes, to minimize movement.
          </li>
        </ul>
        <p className="mb-2 text-gray-900">
          <strong>2.2 Specific Packaging for Consoles and Accessories:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Consoles (Wii, N64, Xbox, PlayStation): Must be
            bundled with all required accessories (controllers, cords, etc.) in
            a single bubble-wrapped package.
          </li>
          <li>
            Handheld Consoles: Must include accessories such as
            adapters, styluses, and SD cards, and be packed together securely.
          </li>
        </ul>
        <p className="mb-2 text-gray-900">
          <strong>2.3 Clear Labeling:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Packages must include accurate labels indicating the contents and any special handling instructions.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Battery Requirements for Handheld Devices
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>3.1 Battery Capacity:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            All handheld devices must have a battery capacity of at least 80% of the original specification.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Delivery and Lead Times
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>4.1 Timely Delivery:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Suppliers must adhere to the delivery timelines agreed upon in the purchase order.
          </li>
          <li>
            Late deliveries may incur penalties.
          </li>
        </ul>
        <p className="mb-2 text-gray-900">
          <strong>4.2 Communication:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Notify Retro VGames immediately of any potential delays or issues affecting order fulfillment.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Legal Compliance
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>5.1 Regulatory Adherence:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            All items must comply with applicable local and international laws, including product safety, import/export regulations, and intellectual property laws.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Payment Terms
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>6.1 Invoicing and Payment:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Payments will be processed as per the terms outlined in the purchase order.
          </li>
          <li>
            Any discrepancies in goods or invoices must be resolved promptly to avoid payment delays.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Inspection and Returns
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>7.1 Quality Inspection:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Retro VGames reserves the right to inspect items upon receipt.
          </li>
          <li>
            Items that do not meet the specified quality standards will be rejected.
          </li>
        </ul>
        <p className="mb-2 text-gray-900">
          <strong>7.2 Replacement and Refunds:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Rejected items must be replaced or refunded at the supplier's expense, including return shipping costs.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Confidentiality
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>8.1 Supplier Obligation:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            All details of transactions, specifications, and agreements must remain confidential unless Retro VGames provides written approval for disclosure.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Inbound Shipment Organization and Packaging
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>9.1 Palletization Requirement:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            For large inbound shipments containing hundreds of games, all items must be palletized for easy handling and inventory management.
          </li>
          <li>
            Each box should be clearly labeled with a number that corresponds to a detailed inventory sheet, outlining the contents of each box.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-900">
          Termination of Agreement
        </h3>
        <p className="mb-2 text-gray-900">
          <strong>10.1 Grounds for Termination:</strong>
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-900">
          <li>
            Retro VGames reserves the right to terminate agreements with suppliers who repeatedly breach quality, delivery, or compliance terms.
          </li>
        </ul>
      </div>
    </div>
    </>
  );
};

export default TermsAndConditions;
