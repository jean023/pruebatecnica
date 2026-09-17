const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function getHealthStatus() {
  const response = await fetch(`${API_BASE_URL}/`);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
