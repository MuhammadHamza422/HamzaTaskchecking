import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const STAGES = {
  PHOTO_UPLOAD: "photo_upload",
  DETAILS: "details",
};

export default function ShippingStepIndicator({ stage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 md:mb-8"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 md:p-6">
        {/* Desktop: Horizontal Layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <div
              className={`flex items-center justify-center w-6 h-6 md:w-12 md:h-12 rounded-full font-semibold text-sm md:text-base transition-all ${
                stage === STAGES.DETAILS
                  ? "bg-purple-600 text-white shadow-lg scale-110"
                  : "bg-green-500 text-white"
              }`}
            >
              {stage === STAGES.DETAILS ? "1" : <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm font-semibold text-gray-900">Step 1: Photo Upload</p>
              <p className="text-xs text-gray-500 hidden sm:block">Capture shipping photos</p>
            </div>
          </div>

          {/* Connector Line */}
          <div className={`flex-1 h-0.5 mx-2 md:mx-4 transition-all ${
            stage === STAGES.PHOTO_UPLOAD ? "bg-gray-300" : "bg-green-500"
          }`} />

          {/* Step 2 */}
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <div
              className={`flex items-center justify-center w-6 h-10 md:w-12 md:h-12 rounded-full font-semibold text-sm md:text-base transition-all ${
                stage === STAGES.PHOTO_UPLOAD
                  ? "bg-purple-600 text-white shadow-lg scale-110"
                  : stage === STAGES.DETAILS
                  ? "bg-gray-200 text-gray-500"
                  : "bg-green-500 text-white"
              }`}
            >
              {stage === STAGES.PHOTO_UPLOAD ? "2" : stage === STAGES.DETAILS ? "2" : <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm font-semibold text-gray-900">Step 2: Review & Complete</p>
              <p className="text-xs text-gray-500 hidden sm:block">Confirm shipment details</p>
            </div>
          </div>
        </div>

        {/* Mobile: Vertical Layout */}
        <div className="md:hidden space-y-1 md:space-y-4">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center md:w-10 md:h-10 w-6 h-6 rounded-full font-semibold text-sm transition-all flex-shrink-0 ${
                stage === STAGES.DETAILS
                  ? "bg-purple-600 text-white shadow-lg scale-110"
                  : "bg-green-500 text-white"
              }`}
            >
              {stage === STAGES.DETAILS ? "1" : <CheckCircle className="w-3 h-3 md:w-5 md:h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Step 1: Photo Upload</p>
              <p className="sm:block hidden text-xs text-gray-500">Capture shipping photos</p>
            </div>
          </div>

          {/* Connector Line - Vertical */}
          <div className={`md:w-0.5 md:h-6 w-0.5 h-3 ml-3 md:ml-5 transition-all ${
            stage === STAGES.PHOTO_UPLOAD ? "bg-gray-300" : "bg-green-500"
          }`} />

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center md:w-10 md:h-10 w-6 h-6 rounded-full font-semibold text-sm transition-all flex-shrink-0 ${
                stage === STAGES.PHOTO_UPLOAD
                  ? "bg-purple-600 text-white shadow-lg scale-110"
                  : stage === STAGES.DETAILS
                  ? "bg-gray-200 text-gray-500"
                  : "bg-green-500 text-white"
              }`}
            >
              {stage === STAGES.PHOTO_UPLOAD ? "2" : stage === STAGES.DETAILS ? "2" : <CheckCircle className="w-3 h-3 md:w-5 md:h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Step 2: Review & Complete</p>
              <p className="sm:block hidden text-xs text-gray-500">Confirm shipment details</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

