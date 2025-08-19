import React from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[999]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[1000] flex items-center justify-center">
        <div
          // stop overlay click from closing when clicking inside modal content
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl w-full max-w-md shadow-lg p-6 max-h-[95vh] overflow-y-auto"
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
