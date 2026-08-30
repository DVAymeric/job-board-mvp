import { z } from "zod";

const idSchema = z.string().trim().min(1, "Identifiant invalide");

export const approveDiscoveredTargetSchema = z.object({ targetId: idSchema });
export const rejectDiscoveredTargetSchema = z.object({ targetId: idSchema });
