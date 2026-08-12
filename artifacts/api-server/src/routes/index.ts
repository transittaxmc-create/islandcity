import { Router, type IRouter } from "express";
import healthRouter from "./health";
import receiptScanRouter from "./receipt-scan";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(receiptScanRouter);
router.use(backupRouter);

export default router;
