const cn = (...classes) => classes.filter(Boolean).join(" ");

export const CustomButton = ({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 py-2",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export const CustomInput = ({ className = "", ...props }) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

export const CustomCard = ({ children, className = "", onClick, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const CustomCardHeader = ({ children, className = "" }) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}>
      {children}
    </div>
  );
};

export const CustomCardTitle = ({ children, className = "" }) => {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-slate-900",
        className
      )}
    >
      {children}
    </h3>
  );
};

export const CustomCardContent = ({ children, className = "" }) => {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
};

export const CustomBadge = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    outline: "border border-slate-200 text-slate-900 hover:bg-slate-100",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

export const CustomCheckbox = ({
  checked,
  onCheckedChange,
  className = "",
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-blue-600 border-blue-600 text-white" : "bg-white",
        className
      )}
    >
      {checked && (
        <svg
          className="w-3 h-3 mx-auto"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
};

export const CustomScrollArea = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100",
        className
      )}
    >
      {children}
    </div>
  );
};
