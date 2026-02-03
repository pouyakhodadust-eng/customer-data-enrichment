// Configuration for the frontend
// In production, these would be set via environment variables

window.API_URL = 'http://localhost:3000';
window.WS_URL = 'ws://localhost:3000';

// Theme settings
window.THEME = {
  default: 'dark',
  storageKey: 'enrichment_theme'
};

// Feature flags
window.FEATURES = {
  darkMode: true,
  realTimeUpdates: false,
  bulkActions: true,
  export: true
};
