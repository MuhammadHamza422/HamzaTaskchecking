import { Truck } from "lucide-react";

export default function ShippingOperationsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <Truck className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipping Operations</h1>
        <p className="text-gray-600">Shipping operations will be available soon</p>
      </div>
    </div>
  );
}

