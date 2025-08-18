import { forwardRef } from "react";

const CustomCard = forwardRef(({ className = "", children, ...props }, ref) => {
  const classes = `rounded-lg border border-gray-200 bg-white shadow-sm ${className}`;

  return (
    <div className={classes} ref={ref} {...props}>
      {children}
    </div>
  );
});

CustomCard.displayName = "CustomCard";

export { CustomCard };
