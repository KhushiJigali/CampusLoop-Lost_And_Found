export async function api(path, options = {}) {
 const token = localStorage.getItem('campus-token');
 const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
 const response = await fetch(`/api${path}`, { ...options, headers });
 if (response.status === 204) return null;
 const data = await response.json().catch(() => ({ message: 'The API is unavailable. Start the backend and MongoDB.' }));
 if (!response.ok) throw new Error(data.message || 'Request failed.');
 return data;
}
