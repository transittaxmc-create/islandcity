import { Router, type IRouter } from "express";
import healthRouter from "./health";
import receiptScanRouter from "./receipt-scan";
import statementScanRouter from "./statement-scan";
import voiceParseRouter from "./voice-parse";
import broadcastEvalRouter from "./broadcast-eval";
import backupRouter from "./backup";
import documentsRouter from "./documents";
import gitPushRouter from "./git-push";
import geminiChatRouter from "./gemini-chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(receiptScanRouter);
router.use(statementScanRouter);
router.use(voiceParseRouter);
router.use(broadcastEvalRouter);
router.use(backupRouter);
router.use(documentsRouter);
router.use(gitPushRouter);
router.use(geminiChatRouter);

export default router;
