import React, { useState, useEffect } from "react";
import { Input, Card, Button, message } from "antd";
import { Search, Plus } from "lucide-react";
import apiClient from "../../../../api/client";

const ProductSearch = ({ onAddProduct, currency }) => {
  const [searchValue, setSearchValue] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchValue.trim().length >= 2) {
      searchProducts(searchValue);
    } else {
      setProducts([]);
    }
  }, [searchValue]);

  const searchProducts = async (search) => {
    setSearching(true);
    try {
      const { data } = await apiClient.get("/api/v1/products/all", {
        params: { page: 1, limit: 50, search },
      });
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      console.error("Failed to search products:", error);
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = (product) => {
    const newProduct = {
      type: "product",
      productId: product._id || product.id,
      name: product.pro_title || product.name || "Unknown Product",
      sku: product.sku || "",
      quantity: 1,
      unitPrice: 0, // Will be set manually
      uom: "Unit",
      taxes: 0,
    };
    onAddProduct(newProduct);
    setSearchValue("");
    setProducts([]);
    message.success("Product added");
  };

  return (
    <div className="mb-4 ">
      <Input
        placeholder="Search products by name or SKU..."
        prefix={<Search size={16} />}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        size="large"
        allowClear
        loading={searching}
      />

      {searchValue.trim().length > 1 && products.length > 0 && (
        <Card className="mt-2 shadow-lg bg-gray-100" size="small">
          <div className="max-h-60 overflow-y-auto space-y-2">
            {products.map((product) => (
              <div
                key={product._id || product.id}
                onClick={() => handleAddProduct(product)}
                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors rounded"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-0">
                      {product.pro_title || product.name || "Unknown Product"}
                    </p>
                    <p className="text-xs text-gray-500 mb-0">
                      SKU: {product.sku || "N/A"}
                    </p>
                  </div>
                  <Plus className="text-blue-600" size={16} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductSearch;

