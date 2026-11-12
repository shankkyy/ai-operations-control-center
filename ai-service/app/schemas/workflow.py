from typing import Literal

from pydantic import BaseModel

WorkflowType = Literal[
    "incident_summary",
    "anomaly_investigation",
    "report_generation",
    "alert_prioritization",
    "remediation_suggestion",
]


class ExecuteStepRequest(BaseModel):
    workflow_type: WorkflowType
    step_name: str
    context: dict


class ExecuteStepResponse(BaseModel):
    output: dict
    summary: str
