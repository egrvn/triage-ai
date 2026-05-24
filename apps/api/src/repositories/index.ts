import type { AppConfig } from "../config.js";
import { MemoryIncidentRepository } from "./memoryRepository.js";
import { PrismaIncidentRepository } from "./prismaRepository.js";
import type { IncidentRepository } from "./types.js";

export function createRepository(config: AppConfig): IncidentRepository {
  if (config.storageMode === "postgres") {
    return new PrismaIncidentRepository();
  }

  return new MemoryIncidentRepository();
}
