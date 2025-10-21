import React, { useState, useEffect, useMemo } from "react";
import { Input, Button, Table, Space, Form } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";

const { Search } = Input;

const ProductsStep = ({
  form,
  onBack,
  customerData,
  initialSelectedProducts = [],
  onProductsChange,
  onSubmit,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState(
    initialSelectedProducts
  );
  const [orderTotal, setOrderTotal] = useState(
    Number(customerData?.order_total || 0)
  );

  useEffect(() => {
    setOrderTotal(Number(customerData?.order_total || 0));
  }, [customerData?.order_total]);

  useEffect(() => {
    onProductsChange?.(selectedProducts);
  }, [selectedProducts]);

  // Fetch products
  const fetchProducts = async ({ queryKey }) => {
    const [_, search] = queryKey;
    const params = new URLSearchParams();
    if (search) {
      params.append("search", search);
    }
    const response = await apiClient.get(`/api/v1/products?${params}`);
    return response.data;
  };

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchQuery],
    queryFn: fetchProducts,
    enabled: searchQuery.length > 0,
  });
  console.log("productsData", productsData);

  // Handle product selection
  const handleProductSelect = (product) => {
    const isAlreadySelected = selectedProducts.find(
      (p) => p._id === product._id
    );
    if (!isAlreadySelected) {
      const newProduct = { ...product, quantity: 1 };
      setSelectedProducts([...selectedProducts, newProduct]);
    }
    setSearchQuery("");
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedProducts = selectedProducts.map((product) =>
      product._id === productId
        ? { ...product, quantity: newQuantity }
        : product
    );
    setSelectedProducts(updatedProducts);
  };

  // Handle product removal
  const handleRemoveProduct = (productId) => {
    const updatedProducts = selectedProducts.filter(
      (product) => product._id !== productId
    );
    setSelectedProducts(updatedProducts);
  };

  // Raw sum based on product sale_price and quantity
  const rawProductsTotal = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      return (
        sum + Number(product.sale_price || 0) * Number(product.quantity || 0)
      );
    }, 0);
  }, [selectedProducts]);

  // Allocate price proportionally so total does not exceed order total
  const computeAllocatedUnitPrice = (salePrice) => {
    const price = Number(salePrice || 0);
    const base = rawProductsTotal;
    const cap = Number(orderTotal || 0);
    if (base > 0 && cap > 0) {
      return (cap / base) * price;
    }
    return price;
  };

  // Submit final payload
  const handleSubmit = () => {
    if (selectedProducts.length === 0) return;

    const items = selectedProducts.map((product) => {
      const perUnit = computeAllocatedUnitPrice(product.sale_price || 0);
      return {
        product: product._id,
        quantity: Number(product.quantity || 1),
        price: perUnit.toFixed(2),
      };
    });

    onSubmit?.({
      items,
      order_total: Number(orderTotal) || 0,
      shipping_amount: Number(customerData?.shipping_amount || 0) || 0,
      tax_amount: Number(customerData?.tax_amount || 0) || 0,
    });
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "pro_title",
      key: "pro_title",
      render: (text) => (
        <div className="font-medium text-gray-900">{text || "N/A"}</div>
      ),
    },
    {
      title: "Price",
      dataIndex: "sale_price",
      key: "sale_price",
      render: (price) => (
        <span className="font-semibold text-green-600">
          ${price ? parseFloat(price).toFixed(2) : "0.00"}
        </span>
      ),
    },
    {
      title: "Quantity",
      key: "quantity",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() =>
              handleQuantityChange(record._id, record.quantity - 1)
            }
            disabled={record.quantity <= 1}
          />
          <span className="w-8 text-center font-medium">{record.quantity}</span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              handleQuantityChange(record._id, record.quantity + 1)
            }
          />
        </Space>
      ),
    },
    {
      title: "Allocated Total",
      key: "allocated_total",
      render: (_, record) => {
        const perUnit = computeAllocatedUnitPrice(record.sale_price || 0);
        const total = perUnit * Number(record.quantity || 0);
        return (
          <span className="font-semibold text-blue-600">${total.toFixed(2)}</span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveProduct(record._id)}
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Product Selection
        </h2>
        <p className="text-gray-600">
          Search and select products for the order
        </p>
      </div>

      {/* Product Search */}
      <div className="relative">
        <Search
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          className="rounded-lg"
        />

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchQuery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto mt-1"
            >
              {productsLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : productsData?.products?.length > 0 ? (
                <div>
                  {productsData.products.map((product) => {
                    const isSelected = selectedProducts.find(
                      (p) => p._id === product._id
                    );
                    return (
                      <div
                        key={product._id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {product.pro_title}
                            </p>
                            <p className="text-gray-600 text-sm">
                              ${product.sale_price}
                            </p>
                          </div>
                          {isSelected && (
                            <p className="text-blue-600 text-lg">✓</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No products found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Products Table */}
      {selectedProducts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Selected Products ({selectedProducts.length})
            </h3>
          </div>
          <Table
            dataSource={selectedProducts}
            columns={columns}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </div>
      )}

      {/* Order Total (from first step) */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-800">
              Order Total (cap):
            </span>
            <span className="text-2xl font-bold text-blue-600">
              ${Number(orderTotal || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="px-8 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-200"
        >
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={selectedProducts.length === 0}
          className={`px-8 py-3 font-semibold rounded-lg transition-colors duration-200 ${
            selectedProducts.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
          }`}
        >
          Create Order
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ProductsStep;
