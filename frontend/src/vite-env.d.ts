/// <reference types="vite/client" />

interface ImportMetaEnv {
  // backend origin (예: https://api.example.com). 미설정 시 localhost:8080 사용
  readonly VITE_API_BASE?: string;
  // ai-server origin (예: https://ai.example.com). 미설정 시 localhost:8000 사용
  readonly VITE_AI_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
