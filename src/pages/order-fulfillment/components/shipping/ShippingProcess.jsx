import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import ShippingDetailsStep from "./steps/ShippingDetailsStep";
import ShippingPhotosStep from "./steps/ShippingPhotosStep";
import ShippingConfirmationStep from "./steps/ShippingConfirmationStep";
import { Loader2 } from "lucide-react";

export default function ShippingProcess() {
  const { packingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingData, setShippingData] = useState(location.state?.shippingData || null);
  const [loading, setLoading] = useState(!location.state?.shippingData);
  const [photos, setPhotos] = useState([]);
  
  // Auto-open camera if requested from landing page
  const [autoOpenCamera, setAutoOpenCamera] = useState(location.state?.autoOpenCamera || false);

  useEffect(() => {
    // If we don't have shipping data passed via state, we'd fetch it here
    if (!shippingData && packingId) {
      // Mock fetch for now
      setTimeout(() => {
        setShippingData({
          packingId,
          orderId: "ORD-123",
          customer: { name: "John Doe", address: "123 Main St, New York, NY" },
          items: [
            { id: 1, name: "Product A", quantity: 2 },
            { id: 2, name: "Product B", quantity: 1 }
          ],
          weight: 1.5,
          dimensions: "10x10x10",
          carrier: "USPS",
          service: "Priority Mail"
        });
        setLoading(false);
      }, 1000);
    }
  }, [packingId, shippingData]);

  const handleNextStep = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handlePhotosCaptured = (capturedPhotos) => {
    setPhotos(capturedPhotos);
    // After capturing photos, user might want to review or just proceed
    // For now, we update state. The step component handles the UI.
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading shipment details...</p>
        </div>
      </div>
    );
  }

  if (!shippingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Shipment not found.</p>
          <button 
            onClick={() => navigate("/fulfillment/shipping")}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Back to Shipping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto p-4">
        <FulfillmentBreadcrumb />
        
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-between px-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= step 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div 
                  className={`w-16 h-1 mx-2 ${
                    currentStep > step ? "bg-purple-600" : "bg-gray-200"
                  }`} 
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <ShippingDetailsStep 
              key="step1"
              data={shippingData} 
              onNext={handleNextStep} 
            />
          )}
          
          {currentStep === 2 && (
            <ShippingPhotosStep 
              key="step2"
              photos={photos}
              onPhotosChange={setPhotos}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              autoOpenCamera={autoOpenCamera}
            />
          )}
          
          {currentStep === 3 && (
            <ShippingConfirmationStep 
              key="step3"
              data={shippingData}
              photos={photos}
              onBack={handlePrevStep}
              onComplete={() => navigate("/fulfillment/shipping")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

