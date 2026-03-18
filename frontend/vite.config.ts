import {defineConfig} from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0", // 또는 true로 설정
    port: 5173
  }
});