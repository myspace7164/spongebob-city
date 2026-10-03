import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: "http://127.0.0.1:5173",
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
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
