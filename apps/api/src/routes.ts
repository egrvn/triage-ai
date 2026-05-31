import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AlertIngestSchema,
  FeedbackRequestSchema,
  GenericIngestSchema,
  IncidentChatRequestSchema,
  IntegrationKindSchema,
  UpdateIncidentStatusSchema,
  UpdateIntegrationSettingSchema
} from "@triage-ai/shared";
import { z, ZodError } from "zod";
import { analyzeIncident } from "./services/analyzer.js";
import { answerIncidentQuestion, createUserChatMessage } from "./services/copilot.js";
import type { IncidentRepository } from "./repositories/types.js";

function parse<TSchema extends z.ZodTypeAny>(schema: TSchema, value: unknown): z.infer<TSchema> {
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
    service: "triage-ai",
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
          text: `[${analyzed.severity.toUpperCase()}] ${analyzed.title}: сводка ИИ готова`,
          deepLink: `/incidents/${analyzed.id}`
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "scenario_run_failed";
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

  app.patch<{ Params: { id: string } }>("/api/incidents/:id/status", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const input = parse(UpdateIncidentStatusSchema, request.body);
      return await repository.updateIncidentStatus(request.params.id, input);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "incident_status_update_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/feedback", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const input = parse(FeedbackRequestSchema, request.body);
      return await repository.saveFeedback(request.params.id, input);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "feedback_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.get<{ Params: { id: string } }>("/api/incidents/:id/chat", async (request, reply) => {
    try {
      return await repository.listChatMessages(request.params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "chat_history_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/chat", async (request, reply) => {
    try {
      const input = parse(IncidentChatRequestSchema, request.body);
      const incident = await repository.getIncident(request.params.id);

      if (!incident) {
        return reply.status(404).send({ error: "incident_not_found" });
      }

      await repository.saveChatMessage(createUserChatMessage(incident.id, input.message));
      const message = await repository.saveChatMessage(answerIncidentQuestion(incident, input));
      return { message };
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "chat_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.get<{ Params: { id: string } }>("/api/incidents/:id/escalations", async (request, reply) => {
    try {
      return await repository.listEscalations(request.params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "escalation_history_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/escalations", async (request, reply) => {
    try {
      return await repository.createEscalation(request.params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "escalation_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/incidents/:id/escalations/handoff-copied", async (request, reply) => {
    try {
      return await repository.recordHandoffCopied(request.params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "handoff_copy_event_failed";
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

      const message = error instanceof Error ? error.message : "integration_update_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post<{ Params: { kind: string } }>("/api/settings/integrations/:kind/test", async (request, reply) => {
    try {
      const kind = parse(IntegrationKindSchema, request.params.kind);
      return await repository.testIntegration(kind);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      const message = error instanceof Error ? error.message : "integration_test_failed";
      return reply.status(message.includes("not found") ? 404 : 500).send({ error: message });
    }
  });

  app.post("/api/demo/reset", async () => repository.resetDemo());

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

  app.post("/api/ingest/custom", async (request, reply) => {
    try {
      const input = parse(GenericIngestSchema, request.body);
      const serviceName = input.serviceName ?? input.service ?? "unknown-service";
      const incident = await repository.ingestCustom({ ...input, serviceName });
      const analysis = analyzeIncident(incident);
      const analyzed = await repository.saveAnalysis(incident.id, analysis);

      return {
        incident: analyzed,
        created: true,
        normalizedServiceName: serviceName
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return sendZodError(reply, error);
      }

      return reply.status(500).send({ error: "custom_ingest_failed" });
    }
  });

  app.post("/api/ingest/metrics", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "test",
      note: "Срезы метрик добавляются через демонстрационные сценарии в этом MVP."
    });
  });

  app.post("/api/ingest/logs", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "test",
      note: "Срезы логов добавляются через демонстрационные сценарии в этом MVP."
    });
  });

  app.post("/api/ingest/deploys", async (_request, reply) => {
    return reply.status(202).send({
      accepted: true,
      mode: "test",
      note: "События развертывания добавляются через демонстрационные сценарии в этом MVP."
    });
  });
}
