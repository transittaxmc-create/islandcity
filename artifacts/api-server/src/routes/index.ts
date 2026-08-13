import { Router, type IRouter } from "express";
import healthRouter from "./health";
import receiptScanRouter from "./receipt-scan";
import statementScanRouter from "./statement-scan";
import voiceParseRouter from "./voice-parse";
import broadcastEvalRouter from "./broadcast-eval";
import backupRouter from "./backup";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(receiptScanRouter);
router.use(statementScanRouter);
router.use(voiceParseRouter);
router.use(broadcastEvalRouter);
router.use(backupRouter);
router.use(documentsRouter);

export default router;
