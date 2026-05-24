export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  storageMode: "memory" | "postgres";
  corsOrigin: string;
  webDistDir?: string;
};

export function getConfig(): AppConfig {
  const storageMode = process.env.STORAGE_MODE === "postgres" ? "postgres" : "memory";

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? "4000"),
    storageMode,
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    webDistDir: process.env.WEB_DIST_DIR
  };
}
