ALTER TABLE "IntegrationSetting"
  ADD COLUMN "lastCheck" TIMESTAMP(3),
  ADD COLUMN "samplePayload" JSONB,
  ADD COLUMN "productionRequirements" JSONB NOT NULL DEFAULT '[]';
