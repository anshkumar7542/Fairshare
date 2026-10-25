import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";
import { asyncHandler } from "../../utils/http.js";
import { assertGroupMember } from "../groups/groupAccess.js";
import { createImportPreview, finalizeImport, getImportBatch, updateAnomalyAction } from "./import.service.js";

const router = Router();
router.use(requireAuth);

const previewSchema = z.object({
  groupId: z.string().min(1),
  fileName: z.string().min(1),
  csvText: z.string().min(1)
});

const anomalyActionSchema = z.object({
  finalActionTaken: z.enum(["APPROVE_IMPORT", "IGNORE_ROW", "FIXED_EXTERNALLY", "NEEDS_REVIEW"])
});

router.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const input = previewSchema.parse(req.body);
    await assertGroupMember(input.groupId, req.user!.id);
    const importBatch = await createImportPreview(prisma, { ...input, userId: req.user!.id });
    res.status(201).json({ import: importBatch });
  })
);

router.get(
  "/:importId",
  asyncHandler(async (req, res) => {
    const importBatch = await getImportBatch(prisma, req.params.importId);
    await assertGroupMember(importBatch.groupId, req.user!.id);
    res.json({ import: importBatch });
  })
);

router.patch(
  "/:importId/anomalies/:anomalyId",
  asyncHandler(async (req, res) => {
    const importBatch = await getImportBatch(prisma, req.params.importId);
    await assertGroupMember(importBatch.groupId, req.user!.id);
    const input = anomalyActionSchema.parse(req.body);
    const anomaly = await updateAnomalyAction(prisma, {
      anomalyId: req.params.anomalyId,
      finalActionTaken: input.finalActionTaken,
      userId: req.user!.id
    });
    res.json({ anomaly });
  })
);

router.post(
  "/:importId/finalize",
  asyncHandler(async (req, res) => {
    const importBatch = await getImportBatch(prisma, req.params.importId);
    await assertGroupMember(importBatch.groupId, req.user!.id);
    const finalized = await finalizeImport(prisma, req.params.importId, req.user!.id);
    res.json({ import: finalized });
  })
);

router.get(
  "/:importId/report",
  asyncHandler(async (req, res) => {
    const importBatch = await getImportBatch(prisma, req.params.importId);
    await assertGroupMember(importBatch.groupId, req.user!.id);
    res.json({
      report: {
        summary: importBatch.report,
        rows: importBatch.rows,
        anomalies: importBatch.anomalies
      }
    });
  })
);

export { router as importsRouter };
