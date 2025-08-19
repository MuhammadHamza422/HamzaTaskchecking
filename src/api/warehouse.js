import apiClient from "./client";

// Base path is relative; baseURL is set via VITE_API_BASE_URL in api client

// GET /api/v1/warehouse/all?page=1&limit=10&search=...
export async function getWarehouses({
  page = 1,
  limit = 50,
  search = "",
} = {}) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (search) params.set("search", String(search));
  const { data } = await apiClient.get(
    `/api/v1/warehouse/all?${params.toString()}`
  );
  return data;
}

// GET /api/v1/warehouse/detail/:id
export async function getWarehouse(id) {
  const { data } = await apiClient.get(`/api/v1/warehouse/detail/${id}`);
  return data;
}

// POST /api/v1/warehouse/create
export async function createWarehouse(body) {
  const { data } = await apiClient.post(`/api/v1/warehouse/create`, body);
  return data;
}

// PATCH /api/v1/warehouse/update/:id
export async function updateWarehouse(id, body) {
  const { data } = await apiClient.patch(
    `/api/v1/warehouse/update/${id}`,
    body
  );
  return data;
}

// DELETE /api/v1/warehouse/delete/:id
export async function deleteWarehouse(id) {
  const { data } = await apiClient.delete(`/api/v1/warehouse/delete/${id}`);
  return data;
}

// GET /api/v1/warehouse/zone/:warehouseId
export async function getZonesByWarehouse(warehouseId) {
  const { data } = await apiClient.get(`/api/v1/warehouse/zone/${warehouseId}`);
  return data;
}

// POST /api/v1/warehouse/zone/create
// Body shape: { name, description, warehouse }
export async function createZone(body) {
  const { data } = await apiClient.post(`/api/v1/warehouse/zone/create`, body);
  return data;
}

// PATCH /api/v1/warehouse/zone/update/:zoneId
export async function updateZone(zoneId, body) {
  const { data } = await apiClient.patch(
    `/api/v1/warehouse/zone/update/${zoneId}`,
    body
  );
  return data;
}

// DELETE /api/v1/warehouse/zone/delete/:zoneId
export async function deleteZone(zoneId) {
  const { data } = await apiClient.delete(
    `/api/v1/warehouse/zone/delete/${zoneId}`
  );
  return data;
}

// LOCATIONS
// GET /api/v1/location/all
export async function getLocations() {
  const { data } = await apiClient.get(`/api/v1/location/all`);
  return data;
}

// POST /api/v1/location/create
// Body: { type, code, warehouse, zone }
export async function createLocation(body) {
  const { data } = await apiClient.post(`/api/v1/location/create`, body);
  return data;
}

// PATCH /api/v1/location/update/:locationId
export async function updateLocation(locationId, body) {
  const { data } = await apiClient.patch(
    `/api/v1/location/update/${locationId}`,
    body
  );
  return data;
}

// DELETE /api/v1/location/delete/:locationId
export async function deleteLocation(locationId) {
  const { data } = await apiClient.delete(
    `/api/v1/location/delete/${locationId}`
  );
  return data;
}

// CSV Import API function
export const importLocationsCSV = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post(
    "/api/v1/location/import/location",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// PRODUCTS
// Update the existing getProducts function
export async function getProducts({
  page = 1,
  limit = 30,
  search = "",
  type = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("search", String(search));
  if (type) params.set("type", String(type)); // Make sure type is being sent
  const { data } = await apiClient.get(
    `/api/v1/products/all?${params.toString()}`
  );
  return data;
}

// DELETE /api/v1/inventry/product/delete/:id
export async function deleteProduct(id) {
  const { data } = await apiClient.delete(
    `/api/v1/inventry/product/delete/${id}`
  );
  return data;
}

// INVENTORY
export async function getInventory({
  page = 1,
  limit = 30,
  search = "",
  warehouseId,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) params.append("search", search);
  if (warehouseId) params.append("warehouse", warehouseId);

  const response = await apiClient.get(`/api/v1/inventry/all?${params}`);
  return response.data;
}

// PATCH /api/v1/inventry/quantity/:inventoryId
export async function updateInventoryQuantity(inventoryId, quantity) {
  const body = { quantity: String(quantity) };
  const { data } = await apiClient.patch(
    `/api/v1/inventry/quantity/${inventoryId}`,
    body
  );
  return data;
}

// POST /api/v1/inventry/create
// Body: { productId, locationId, quantity }
export async function createInventory(body) {
  const { data } = await apiClient.post(`/api/v1/inventry/create`, body);
  return data;
}


// POST /api/v1/manualOrder/create
// Body: { customerId, orderNumber, orderDate, orderStatus, orderTotal, orderItems }
export async function createManualOrder(orderData) {
  const { data } = await apiClient.post("/api/v1/manualOrder/create", orderData);
  return data;
}
