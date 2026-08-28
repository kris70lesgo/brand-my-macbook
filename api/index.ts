import express from "express";
import { attachPlanMyMapbookApi } from "../server/plan-my-mapbook";

/** Vercel Node function that serves every Plan My Mapbook API endpoint. */
const app = express();
attachPlanMyMapbookApi(app);

export default app;
