import { PrismaClient } from "@prisma/client";
import { scenarioFixtures } from "../src/data/scenarios.js";
import { defaultIntegrationSettings } from "../src/repositories/defaultSettings.js";

const prisma = new PrismaClient();

for (const scenario of scenarioFixtures) {
  await prisma.scenario.upsert({
    where: { id: scenario.id },
    update: {
      name: scenario.name,
      incidentType: scenario.incidentType,
      serviceName: scenario.serviceName,
      description: scenario.description,
      recommended: scenario.recommended
    },
    create: {
      id: scenario.id,
      name: scenario.name,
      incidentType: scenario.incidentType,
      serviceName: scenario.serviceName,
      description: scenario.description,
      recommended: scenario.recommended
    }
  });
}

for (const setting of defaultIntegrationSettings) {
  await prisma.integrationSetting.upsert({
    where: { kind: setting.kind },
    update: setting,
    create: setting
  });
}

await prisma.$disconnect();
