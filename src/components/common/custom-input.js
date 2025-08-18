import { forwardRef } from "react";

const CustomInput = forwardRef(({ className = "", ...props }, ref) => {
  const classes = `flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`;

  return <input className={classes} ref={ref} {...props} />;
});

CustomInput.displayName = "CustomInput";

export { CustomInput };
