import { z } from "zod";
import type { KaiSlots } from "./types";

const kaiSlotUpdateSchema = z.object({
  destination: z.string().min(1).optional(),
  dateWindow: z.string().min(1).optional(),
  travellerCount: z.number().int().positive().optional(),
  certLevel: z.enum(["NONE", "OW", "AOW", "RESCUE", "DIVEMASTER", "INSTRUCTOR"]).optional(),
  budgetUsd: z.number().nonnegative().optional(),
  activityType: z.string().min(1).optional(),
});

export function mergeKaiSlots(current: KaiSlots, update: unknown): KaiSlots {
  const parsedUpdate = kaiSlotUpdateSchema.parse(update);

  return {
    ...current,
    ...parsedUpdate,
  };
}
