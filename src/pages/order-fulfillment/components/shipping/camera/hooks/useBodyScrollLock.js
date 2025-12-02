import { useEffect } from "react";

// Hook to lock body scroll when camera modal is open
export const useBodyScrollLock = () => {
  useEffect(() => {
    // Store original styles
    const originalBodyStyle = {
      overflow: document.body.style.overflow,
      padding: document.body.style.padding,
      paddingRight: document.body.style.paddingRight,
      margin: document.body.style.margin,
    };
    const originalHtmlStyle = {
      overflow: document.documentElement.style.overflow,
      padding: document.documentElement.style.padding,
      margin: document.documentElement.style.margin,
    };

    // Remove all margins and padding from body and html
    document.body.style.overflow = "hidden";
    document.body.style.padding = "0";
    document.body.style.paddingRight = "0";
    document.body.style.margin = "0";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.padding = "0";
    document.documentElement.style.margin = "0";

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = originalBodyStyle.overflow;
      document.body.style.padding = originalBodyStyle.padding;
      document.body.style.paddingRight = originalBodyStyle.paddingRight;
      document.body.style.margin = originalBodyStyle.margin;
      document.documentElement.style.overflow = originalHtmlStyle.overflow;
      document.documentElement.style.padding = originalHtmlStyle.padding;
      document.documentElement.style.margin = originalHtmlStyle.margin;
    };
  }, []);
};

