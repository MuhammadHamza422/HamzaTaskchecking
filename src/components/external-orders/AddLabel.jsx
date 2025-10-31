"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Select, Form, message } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

const PLATFORMS = [
  { id: "shopify", label: "Shopify" },
  { id: "walmart", label: "Walmart" },
  { id: "woocommerce", label: "WooCommerce" },
];

export default function AddLabelModal({
  order,
  activeTab,
  fetchProcessedOrders,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    platform: "shopify",
    carrierCode: "",
    packageCode: "",
    weight: {
      value: 0,
      units: "pounds",
    },
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      units: "inches",
    },
  });

  useEffect(() => {
    if (open) {
      setFormData({
        platform: activeTab ?? "shopify",
        carrierCode: order?.carrierCode || "",
        packageCode: order?.packageCode || "",
        weight: {
          value: order?.weight?.value || 0,
          units: order?.weight?.units || "pounds",
        },

        dimensions: {
          length: order?.dimensions?.length || 0,
          width: order?.dimensions?.width || 0,
          height: order?.dimensions?.height || 0,
          units: order?.dimensions?.units || "inches",
        },
      });
      fetchCarriers();
    }
  }, [open]);

  const fetchCarriers = async () => {
    setCarriersLoading(true);
    try {
      const response = await fetch(
        "http://localhost:9901/api/v1/shipstation/carriers"
      );
      const data = await response.json();

      if (data.success && data.carriers) {
        setCarriers(data.carriers);
        console.log("[v0] Carriers fetched:", data.carriers);
      } else {
        message.error("Failed to fetch carriers");
      }
    } catch (err) {
      console.error("[v0] Error fetching carriers:", err);
      message.error("Error fetching carriers");
    } finally {
      setCarriersLoading(false);
    }
  };

  useEffect(() => {
    if (formData.carrierCode) {
      fetchPackages(formData.carrierCode);
    } else {
      setPackages([]);
    }
  }, [formData.carrierCode]);

  const fetchPackages = async (carrierCode) => {
    setPackagesLoading(true);
    try {
      const response = await fetch(
        `http://localhost:9901/api/v1/shipstation/packages?carrierCode=${carrierCode}`
      );
      const data = await response.json();

      if (data.success && data.packages) {
        setPackages(data.packages);
        console.log("[v0] Packages fetched for carrier:", data.packages);
      } else {
        message.error("Failed to fetch packages");
      }
    } catch (err) {
      console.error("[v0] Error fetching packages:", err);
      message.error("Error fetching packages");
    } finally {
      setPackagesLoading(false);
    }
  };

  // Submit label
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await apiClient.patch(
        `/api/v1/orders/shipstation/label/${order.order_key}`,
        {
          platform: formData.platform,
          carrierCode: formData.carrierCode,
          packageCode: formData.packageCode,
          weight: {
            value: formData.weight.value,
            units: formData.weight.units,
          },
          dimensions: {
            length: formData.dimensions.length,
            width: formData.dimensions.width,
            height: formData.dimensions.height,
            units: formData.dimensions.units,
          },
        }
      );

      if (data) {
        message.success("Label added successfully!");
        Swal.fire({
          icon: "success",
          title: "Label Added",
          text: "Label has been added successfully!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
        fetchProcessedOrders();
        setOpen(false);
        setTimeout(() => {
          setOpen(false);
          form.resetFields();
          setFormData({
            platform: "shopify",
            carrierCode: "",
            packageCode: "",
            weight: {
              value: 0,
              units: "pounds",
            },
            dimensions: {
              length: 0,
              width: 0,
              height: 0,
              units: "inches",
            },
          });
        }, 500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      message.error(errorMessage);
      console.error("[v0] Error adding label:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        icon={
          order.carrierCode ? (
            <CheckOutlined className="text-green-600" />
          ) : (
            <PlusOutlined className="text-blue-600" />
          )
        }
        onClick={() => setOpen(true)}
        size="small"
        className={`p-1 ${
          order.carrierCode
            ? "text-green-600 hover:text-green-800"
            : "text-blue-600 hover:text-blue-800"
        }`}
      >
        {order.carrierCode ? "Labeled" : "Add Label"}
      </Button>

      <Modal
        title="Add New Label"
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Add Label
          </Button>,
        ]}
        width={600}
      >
        <Form layout="vertical" form={form} className="mt-6">
          {/* Platform */}
          <Form.Item label="Platform" required>
            <Select
              value={formData.platform}
              onChange={(value) =>
                setFormData({ ...formData, platform: value })
              }
              options={PLATFORMS.map((plat) => ({
                label: plat.label,
                value: plat.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Carrier" required className=" py-3">
            <Select
              placeholder="Select a carrier"
              loading={carriersLoading}
              value={formData.carrierCode || undefined}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  carrierCode: value,
                  packageCode: "",
                })
              }
              options={carriers.map((carrier) => ({
                label: `${carrier.name} (${carrier.nickname || carrier.code})`,
                value: carrier.code,
              }))}
            />
          </Form.Item>

          <Form.Item label="Package Code" required>
            <Select
              placeholder="Select a package code"
              loading={packagesLoading}
              disabled={!formData.carrierCode}
              value={formData.packageCode || undefined}
              onChange={(value) =>
                setFormData({ ...formData, packageCode: value })
              }
              options={packages.map((pkg) => ({
                label: pkg.name,
                value: pkg.code,
              }))}
            />
          </Form.Item>

          <div className="mb-6 mt-2">
            <h4 className="font-semibold py-3">Weight</h4>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="Value" required>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.weight.value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weight: {
                        ...formData.weight,
                        value: Number.parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Units" required>
                <Select
                  value={formData.weight.units}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      weight: {
                        ...formData.weight,
                        units: value,
                      },
                    })
                  }
                  options={[
                    { label: "Pounds", value: "pounds" },
                    { label: "Ounces", value: "ounces" },
                    { label: "Grams", value: "grams" },
                  ]}
                />
              </Form.Item>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-4">Dimensions</h4>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Form.Item label="Length" required>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.dimensions.length}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dimensions: {
                        ...formData.dimensions,
                        length: Number.parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Width" required>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.dimensions.width}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dimensions: {
                        ...formData.dimensions,
                        width: Number.parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Form.Item>
              <Form.Item label="Height" required>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.dimensions.height}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dimensions: {
                        ...formData.dimensions,
                        height: Number.parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Form.Item>
            </div>
            <Form.Item label="Units" required>
              <Select
                value={formData.dimensions.units}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    dimensions: {
                      ...formData.dimensions,
                      units: value,
                    },
                  })
                }
                options={[
                  { label: "Inches", value: "inches" },
                  { label: "Centimeters", value: "centimeters" },
                  { label: "Meters", value: "meters" },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}
