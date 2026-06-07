/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TTS_API_KEY: string;
  readonly VITE_TTS_SYNTHESIZE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
