import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    root: ".",
    publicDir: "public",
    server: {
      proxy: {
        "/api/tts/synthesize": {
          target: "https://tts.api.cloud.yandex.net",
          changeOrigin: true,
          rewrite: () => "/speech/v1/tts:synthesize",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const apiKey = env.VITE_TTS_API_KEY;
              if (apiKey) {
                proxyReq.setHeader("Authorization", `Api-Key ${apiKey}`);
              }
            });
          },
        },
      },
    },
  };
});
