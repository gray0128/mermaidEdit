/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_DESCRIPTION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ANALYTICS_ID: string
  readonly VITE_ENABLE_ERROR_TRACKING: string
  readonly VITE_ERROR_TRACKING_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}