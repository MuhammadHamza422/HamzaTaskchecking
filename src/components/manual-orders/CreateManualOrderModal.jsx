import React, { useState } from "react";
import { Modal, Form, Steps } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import CustomerInfoStep from "./CustomerInfoStep";
import ProductsStep from "./ProductsStep";
import ShippingBillingStep from "./ShippingBillingStep";
import { createManualOrder } from "../../api/manualOrders";

const { Step } = Steps;

const CreateManualOrderModal = ({ visible, onCancel, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerData: {},
    productsData: {},
  });

  const steps = [
    {
      title: "Customer Info",
      icon: <UserOutlined />,
      content: "customer",
    },
    {
      title: "Products",
      icon: <ShoppingCartOutlined />,
      content: "products",
    },
    {
      title: "Shipping & Billing",
      icon: <EnvironmentOutlined />,
      content: "shipping",
    },
  ];

  // Handle step navigation
  const handleNext = (data, stepType) => {
    if (stepType === "customer") {
      setFormData((prev) => ({ ...prev, customerData: data }));
      setCurrentStep(1);
    } else if (stepType === "products") {
      setFormData((prev) => ({ ...prev, productsData: data }));
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  const handleSubmit = async (finalData) => {
    setIsSubmitting(true);
    try {
      const response = await createManualOrder(finalData);

      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "Order Created Successfully!",
          text: `Manual order has been created`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });

        handleModalClose();
        onSuccess && onSuccess(response);
      } else {
        throw new Error(response.message || "Failed to create order");
      }
    } catch (error) {
      console.error("Error creating manual order:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Create Order",
        text:
          error.response?.data?.message ||
          error.message ||
          "An error occurred while creating the order",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setCurrentStep(0);
    setFormData({ customerData: {}, productsData: {} });
    form.resetFields();
    onCancel();
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <CustomerInfoStep
            form={form}
            onNext={(data) => handleNext(data, "customer")}
          />
        );
      case 1:
        return (
          <ProductsStep
            form={form}
            onNext={(data) => handleNext(data, "products")}
            onBack={handleBack}
            customerData={formData.customerData}
          />
        );
      case 2:
        return (
          <ShippingBillingStep
            form={form}
            onBack={handleBack}
            onSubmit={handleSubmit}
            customerData={formData.customerData}
            productsData={formData.productsData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Create Manual Order
          </h2>
          <p className="text-gray-600">
            Fill in the details to create a new manual order
          </p>
        </div>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={1000}
      centered
      destroyOnClose
      className="manual-order-modal"
    >
      <div className="py-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                icon={step.icon}
                status={
                  index < currentStep
                    ? "finish"
                    : index === currentStep
                    ? "process"
                    : "wait"
                }
              />
            ))}
          </Steps>
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Form
                form={form}
                layout="vertical"
                className="space-y-6"
                preserve={false}
              >
                {renderStepContent()}
              </Form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Creating Order...</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateManualOrderModal;
