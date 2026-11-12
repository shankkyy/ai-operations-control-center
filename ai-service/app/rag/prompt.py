from app.services.llm.base import ContextChunk

SYSTEM_INSTRUCTIONS = (
    "You are an operations assistant. Answer ONLY using the retrieved context "
    "below. If the context does not contain the answer, say so explicitly — "
    "never invent facts. Cite each claim with the record title it came from."
)


def build_prompt(question: str, context: list[ContextChunk]) -> str:
    if not context:
        context_block = "(no relevant records retrieved)"
    else:
        context_block = "\n\n".join(
            f"[{c.title}] (similarity={c.similarity:.2f})\n{c.content}" for c in context
        )
    return (
        f"{SYSTEM_INSTRUCTIONS}\n\n"
        f"### Retrieved context\n{context_block}\n\n"
        f"### Question\n{question}\n\n"
        f"### Answer"
    )
