export type MeshConfig = {
  rssiThreshold: number;
  maxHops: number;
  messageTTL: number;
  zoneId?: string;
  tokenExpiresAt?: number;
};

const DEFAULT_CONFIG: MeshConfig = {
  rssiThreshold: -70,
  maxHops: 7,
  messageTTL: 43200,
};

const CONFIG_KEY = 'kavach_mesh_config';
let currentConfig: MeshConfig = { ...DEFAULT_CONFIG };

export const loadConfig = (): MeshConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tokenExpiresAt && Date.now() > parsed.tokenExpiresAt) {
        console.warn('Zone Token expired. Reverting to open mesh.');
        currentConfig = { ...DEFAULT_CONFIG };
        localStorage.removeItem(CONFIG_KEY);
      } else {
        currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load mesh config', e);
  }
  return currentConfig;
};

export const saveConfig = (config: Partial<MeshConfig>): void => {
  currentConfig = { ...currentConfig, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(currentConfig));
};

export const getConfig = (): MeshConfig => currentConfig;
