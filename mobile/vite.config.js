import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {viteSingleFile} from "vite-plugin-singlefile";

// One self-contained index.html: works offline inside the APK and as a hosted page.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
  server: {fs: {allow: [".."]}},
});
