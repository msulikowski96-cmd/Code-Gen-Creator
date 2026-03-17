import { Router, type IRouter } from "express";
import healthRouter from "./health";
import codegenRouter from "./codegen";

const router: IRouter = Router();

router.use(healthRouter);
router.use(codegenRouter);

export default router;
