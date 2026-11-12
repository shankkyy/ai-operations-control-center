import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";
import { metricsRouter } from "./metrics.js";
import { documentsRouter } from "./documents.js";
import { assistantRouter } from "./assistant.js";
import { anomaliesRouter } from "./anomalies.js";
import { workflowsRouter } from "./workflows.js";
import { jobsRouter } from "./jobs.js";
import { alertsRouter } from "./alerts.js";
import { auditLogsRouter } from "./auditLogs.js";
import { settingsRouter } from "./settings.js";

export const apiV1Router = Router();

apiV1Router.use(healthRouter);
apiV1Router.use(authRouter);
apiV1Router.use(dashboardRouter);
apiV1Router.use(metricsRouter);
apiV1Router.use(documentsRouter);
apiV1Router.use(assistantRouter);
apiV1Router.use(anomaliesRouter);
apiV1Router.use(workflowsRouter);
apiV1Router.use(jobsRouter);
apiV1Router.use(alertsRouter);
apiV1Router.use(auditLogsRouter);
apiV1Router.use(settingsRouter);
