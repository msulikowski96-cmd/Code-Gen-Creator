import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, generationHistoryTable } from "@workspace/db";
import {
  GenerateCodeBody,
  GetHistoryItemParams,
} from "@workspace/api-zod";
import {
  generateNativeModuleFiles,
  generateNativeComponentFiles,
  TEMPLATES,
} from "../lib/codegenEngine.js";

const router: IRouter = Router();

router.post("/codegen/generate", async (req, res): Promise<void> => {
  const parsed = GenerateCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.message });
    return;
  }

  const { specType, platform, spec, moduleName } = parsed.data;

  let files;
  if (specType === "NativeModule") {
    files = generateNativeModuleFiles(moduleName, platform, spec);
  } else {
    files = generateNativeComponentFiles(moduleName, platform, spec);
  }

  const [record] = await db
    .insert(generationHistoryTable)
    .values({
      moduleName,
      specType,
      platform,
      spec,
      files: JSON.stringify(files),
      fileCount: files.length,
    })
    .returning();

  res.json({
    id: record.id,
    moduleName: record.moduleName,
    specType: record.specType,
    platform: record.platform,
    files,
    generatedAt: record.generatedAt.toISOString(),
  });
});

router.get("/codegen/templates", (_req, res): void => {
  res.json({ templates: TEMPLATES });
});

router.get("/codegen/history", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: generationHistoryTable.id,
      moduleName: generationHistoryTable.moduleName,
      specType: generationHistoryTable.specType,
      platform: generationHistoryTable.platform,
      generatedAt: generationHistoryTable.generatedAt,
      fileCount: generationHistoryTable.fileCount,
    })
    .from(generationHistoryTable)
    .orderBy(generationHistoryTable.generatedAt);

  res.json({
    items: rows.map((r) => ({
      ...r,
      generatedAt: r.generatedAt.toISOString(),
    })),
  });
});

router.delete("/codegen/history", async (_req, res): Promise<void> => {
  await db.delete(generationHistoryTable);
  res.json({ success: true, message: "History cleared" });
});

router.get("/codegen/history/:id", async (req, res): Promise<void> => {
  const params = GetHistoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(generationHistoryTable)
    .where(eq(generationHistoryTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "History item not found" });
    return;
  }

  const files = typeof row.files === "string" ? JSON.parse(row.files) : row.files;

  res.json({
    id: row.id,
    moduleName: row.moduleName,
    specType: row.specType,
    platform: row.platform,
    files,
    generatedAt: row.generatedAt.toISOString(),
  });
});

export default router;
