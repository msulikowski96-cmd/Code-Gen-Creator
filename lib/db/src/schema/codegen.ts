import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generationHistoryTable = pgTable("generation_history", {
  id: serial("id").primaryKey(),
  moduleName: text("module_name").notNull(),
  specType: text("spec_type").notNull(),
  platform: text("platform").notNull(),
  spec: text("spec").notNull(),
  files: jsonb("files").notNull().default([]),
  fileCount: integer("file_count").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGenerationHistorySchema = createInsertSchema(generationHistoryTable).omit({
  id: true,
  generatedAt: true,
});

export type InsertGenerationHistory = z.infer<typeof insertGenerationHistorySchema>;
export type GenerationHistory = typeof generationHistoryTable.$inferSelect;
