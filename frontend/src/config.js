// Central API config. Override at build time with VITE_API_BASE.
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:8080'
