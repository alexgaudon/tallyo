import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".tallyo");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface Config {
  authToken?: string;
  apiUrl?: string;
}

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as Config;
  } catch (error) {
    console.error("Failed to read config file:", error);
    return {};
  }
}

export function saveConfig(config: Config): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const existingConfig = getConfig();
    const updatedConfig = { ...existingConfig, ...config };
    writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

export function getAuthToken(): string | undefined {
  return getConfig().authToken;
}

export function setAuthToken(token: string): void {
  saveConfig({ authToken: token });
}

export function getApiUrl(): string {
  return getConfig().apiUrl || "http://localhost:3000";
}

export function setApiUrl(url: string): void {
  saveConfig({ apiUrl: url });
}
