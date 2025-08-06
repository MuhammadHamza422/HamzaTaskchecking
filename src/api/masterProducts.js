export async function fetchMasterProducts() {
  const res = await fetch('/api/master-products')
  if (!res.ok) throw new Error('Failed to load master products')
  // we assume the server returns a raw JSON array of { id, name, sku }
  return res.json()
}