import apiClient from './client';

// CSV Import API function
export const importCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/api/v1/products/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}; 

// Fetch mapped (merged) products with server-side pagination and search
export const fetchMappedProducts = async ({ page, limit, search }) => {
  const params = new URLSearchParams({
    page: String(page ?? 1),
    limit: String(limit ?? 50),
  });

  if (search && String(search).trim().length > 0) {
    params.append('search', String(search).trim());
  }

  const response = await apiClient.get(`/api/v1/products/mapped/all?${params.toString()}`);
  return response.data;
};