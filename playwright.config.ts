import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "5174";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: {
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args:
        process.env.SOFTWARE_WEBGL === "1"
          ? [
              "--enable-webgl",
              "--use-gl=angle",
              "--use-angle=swiftshader-webgl",
              "--disable-gpu",
              "--enable-unsafe-swiftshader",
            ]
          : [],
    },
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
