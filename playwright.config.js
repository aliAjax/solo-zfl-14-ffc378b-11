import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// 容器内无 root 权限时，Chromium 系统库解压在本目录下，需要注入 LD_LIBRARY_PATH
const localLibs = path.join(os.homedir(), ".cache", "chromium-libs");
const use = { baseURL: "http://localhost:5114", headless: true };
if (existsSync(localLibs)) {
  const libPath = [
    path.join(localLibs, "usr/lib/aarch64-linux-gnu"),
    path.join(localLibs, "lib/aarch64-linux-gnu"),
    process.env.LD_LIBRARY_PATH
  ].filter(Boolean).join(":");
  use.launchOptions = { env: { ...process.env, LD_LIBRARY_PATH: libPath } };
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5114",
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});
