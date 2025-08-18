"use client";

import { forwardRef } from "react";
import { Check } from "lucide-react";

const CustomCheckbox = forwardRef(
  (
    { checked = false, onCheckedChange, className = "", disabled = false },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    const classes = `inline-flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-blue-600 border-blue-600 text-white" : "hover:bg-gray-50"
    } ${className}`;

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={classes}
        onClick={handleClick}
        disabled={disabled}
        ref={ref}
      >
        {checked && <Check className="h-3 w-3" />}
      </button>
    );
  }
);

CustomCheckbox.displayName = "CustomCheckbox";

export { CustomCheckbox };
