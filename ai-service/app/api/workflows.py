from fastapi import APIRouter, Depends, HTTPException

from app.agents.workflows import UnknownWorkflowStep, execute_step
from app.schemas.workflow import ExecuteStepRequest, ExecuteStepResponse
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

router = APIRouter()


@router.post("/workflows/execute-step", response_model=ExecuteStepResponse)
async def execute(req: ExecuteStepRequest, llm: LLMProvider = Depends(get_llm_provider)):
    try:
        output = await execute_step(req.workflow_type, req.step_name, req.context, llm)
    except UnknownWorkflowStep as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    summary = next(iter(output.values())) if output else ""
    return ExecuteStepResponse(output=output, summary=str(summary)[:500])
