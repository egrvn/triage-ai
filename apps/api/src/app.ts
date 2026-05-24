import cors from "@fastify/cors";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig, type AppConfig } from "./config.js";
import { createRepository } from "./repositories/index.js";
import type { IncidentRepository } from "./repositories/types.js";
import { registerRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type CreateAppOptions = {
  config?: AppConfig;
  repository?: IncidentRepository;
};

export async function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? getConfig();
  const repository = options.repository ?? createRepository(config);
  const app = fastify({
    logger: config.nodeEnv !== "test"
  });

  await app.register(cors, {
    origin: config.corsOrigin === "*" ? true : config.corsOrigin
  });

  await registerRoutes(app, repository);

  const webDistDir = config.webDistDir ?? path.resolve(__dirname, "../../web/dist");
  if (existsSync(webDistDir)) {
    await app.register(fastifyStatic, {
      root: webDistDir,
      prefix: "/"
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith("/api/")) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.sendFile("index.html");
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const message = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({
      error: "internal_error",
      message: config.nodeEnv === "production" ? "Unexpected server error" : message
    });
  });

  return app;
}
