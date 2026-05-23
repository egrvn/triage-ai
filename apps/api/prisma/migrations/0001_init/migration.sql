CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "scenarioId" TEXT,
    "summary" TEXT,
    "hypothesis" TEXT,
    "confidence" TEXT,
    "reasoning" JSONB,
    "nextStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetricPoint" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "labels" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "MetricPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LogEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "traceId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'elk',
    CONSTRAINT "LogEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeployEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "DeployEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisEvidence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "AnalysisEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentFeedback" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "usefulness" TEXT NOT NULL,
    "hypothesisVerdict" TEXT NOT NULL,
    "correctedRootCause" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSetting" (
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "mode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("kind")
);

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetricPoint" ADD CONSTRAINT "MetricPoint_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LogEvent" ADD CONSTRAINT "LogEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeployEvent" ADD CONSTRAINT "DeployEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisEvidence" ADD CONSTRAINT "AnalysisEvidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentFeedback" ADD CONSTRAINT "IncidentFeedback_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
