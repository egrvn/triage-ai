import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AlertIngestSchema,
  FeedbackRequestSchema,
  UpdateIntegrationSettingSchema
} from "@coursework/shared";
import { ZodError, type ZodSchema } from "zod";
import { analyzeIncident } from "./services/analyzer.js";
import type { IncidentRepository } from "./repositories/types.js";

function parse<T>(schema: ZodSchema<T>, value: unknown): T {
  return schema.parse(value);
}

function sendZodError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: "validation_error",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  });
}

export async function registerRoutes(app: FastifyInstance, repository: IncidentRepository) {
  app.get("/api/health", async () => ({
    ok: true,
    service: "cloudru-ai-monitoring-assistant",
    timestamp: new Date().toISOString()
  }));

  app.get("/api/scenarios", async () => repository.listScenarios());

  app.post<{ Params: { id: string } }>("/api/scenarios/:id/run", async (request, reply) => {
    try {
      const incident = await repository.runScenario(request.params.id);
      const analysis = analyzeIncident(incident);
      const analyzed = await repository.saveAnalysis(incident.id, analysis);

      return {
        incident: analyzed,
        notification: {
          channel: "telegram",
          text: `[${analyzed.severity.toUpperCase()}] ${analyzed.title}: AI summary is ready`,
          deepLink: `/incidents/${analyzed.id}`
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scenario run failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.get("/api/incidents", async () => repository.listIncidents());

  app.get<{ Params: { id: string } }>("/api/incidents/:id", async (request, reply) => {
    const incident = await repository.getIncident(request.params.id);

    if (!incident) {
      return reply.status(404).send({ error: "incident_not_found" });
    }

    return incident;
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/analyze", async (request, reply) => {
    const incident = await repository.getIncident(request.params.id);

    if (!incident) {
      return reply.status(404).send({ error: "incident_not_found" });
    }

    const analysis = analyzeIncident(incident);
    return repository.saveAnalysis(incident.id, analysis);
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/feedback", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const input = parse(FeedbackRequestSchema, request.body);
      return await repository.saveFeedback(request.params.id, input);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "Feedback failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.get("/api/settings/integrations", async () => repository.listIntegrations());

  app.patch("/api/settings/integrations", async (request, reply) => {
    try {
      const input = parse(UpdateIntegrationSettingSchema, request.body);
      return await repository.updateIntegration(input);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "Integration update failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post("/api/ingest/alerts", async (request, reply) => {
    try {
      const input = parse(AlertIngestSchema, request.body);
      return await repository.ingestAlert({ ...input, labels: input.labels ?? {} });
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      return reply.status(500).send({ error: "alert_ingest_failed" });
    }
  });

  app.post("/api/ingest/metrics", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "mock",
      note: "Metric slices are attached through scenario runs in this MVP."
    });
  });

  app.post("/api/ingest/logs", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "mock",
      note: "Log slices are attached through scenario runs in this MVP."
    });
  });

  app.post("/api/ingest/deploys", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "mock",
      note: "Deploy events are attached through scenario runs in this MVP."
    });
  });
}
