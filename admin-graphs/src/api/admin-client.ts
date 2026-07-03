import axios from "axios"

// Separate axios instance ("api client 2") for the admin API — a different
// service/host from the analytics-service apiClient in client.ts talks to,
// so it gets its own base URL and its own instance rather than sharing one.
export const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// TEMPORARY: the admin API requires an access_token, which will eventually
// arrive via a redirect from the admin panel (?access_token=...) rather than
// living here. Until that flow exists, it's read from env instead of being
// a literal in source, so it isn't sitting in git history once it's rotated
// — see .env (gitignored), not .env.example.
adminApiClient.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_ADMIN_ACCESS_TOKEN
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
