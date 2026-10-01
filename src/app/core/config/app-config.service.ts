import { Injectable } from '@angular/core';
import { environment } from '@/environments/environment';

export interface AppConfigData {
  serverUrl?: string;
}

let configData: AppConfigData | null = null;

/**
 * Carga config.json (public/) antes del bootstrap. Si el archivo
 * no existe o falla, se usa el environment compilado como fallback.
 */
export async function loadAppConfig(): Promise<AppConfigData> {
  if (configData) return configData;
  // En SSR no hay archivos relativos: usamos el fallback del environment.
  if (typeof window === 'undefined') {
    configData = {};
    return configData;
  }
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (res.ok) {
      const data: unknown = await res.json();
      if (data && typeof data === 'object' && typeof (data as AppConfigData).serverUrl === 'string') {
        configData = data as AppConfigData;
        return configData;
      }
    }
  } catch {
    // archivo ausente o servidor estático sin soporte — usar environment
  }
  configData = {};
  return configData;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  serverUrl(): string {
    return configData?.serverUrl || environment.serverUrl;
  }
}
