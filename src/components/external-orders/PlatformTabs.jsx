import React from "react";
import { PLATFORM_CONFIG } from "../../config/platforms";

export default function PlatformTabs({ activeTab, onTabChange, children }) {
  return (
    <div className="rounded-lg border border-[#f0f0f0] p-4 bg-white overflow-hidden">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4 max-md:overflow-x-auto hide-scrollbar">
          {Object.values(PLATFORM_CONFIG).map((config) => (
            <button
              key={config.key}
              onClick={() => onTabChange(config.key)}
              className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:border-none
                  ${
                    activeTab === config.key
                      ? `${config.bgColor} text-white shadow-md transform scale-105`
                      : `text-gray-600 bg-gray-200 hover:text-gray-900`
                  }
                `}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  activeTab === config.key ? "bg-white" : config.bgColor
                }`}
              ></div>
              {config.label}
            </button>
          ))}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

export { PLATFORM_CONFIG };
