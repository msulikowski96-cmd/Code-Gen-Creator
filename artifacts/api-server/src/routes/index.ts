import { Router, type IRouter } from "express";
import healthRouter from "./health";
import codegenRouter from "./codegen";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(codegenRouter);
router.use(chatRouter);

export default router;
