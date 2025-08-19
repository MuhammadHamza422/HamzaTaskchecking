import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Resolve container element (supports function or element). Fallback to document.body
  const resolveContainer = () => {
    try {
      if (typeof container === "function") return container() || document.body;
      return container || document.body;
    } catch (err) {
      return document.body;
    }
  };

  const portalTarget = resolveContainer();

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999999]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[999999999] flex items-center justify-center"
        aria-hidden={false}
      >
        <div
          // stop overlay click from closing when clicking inside modal content
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white rounded-xl w-full max-w-md shadow-lg p-6 max-h-[95vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Close (X) button - top-right inside modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            aria-label="Close"
            title="Close"
            className="absolute top-3 right-3 inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {/* simple accessible SVG close icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 8.586L15.293 3.293a1 1 0 111.414 1.414L11.414 10l5.293 5.293a1 1 0 01-1.414 1.414L10 11.414l-5.293 5.293a1 1 0 01-1.414-1.414L8.586 10 3.293 4.707A1 1 0 114.707 3.293L10 8.586z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {children}
        </div>
      </div>
    </>,
    portalTarget
  );
}
