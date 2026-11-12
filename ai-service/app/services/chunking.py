def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split on whitespace into overlapping word windows."""
    words = text.split()
    if not words:
        return []
    if overlap >= chunk_size:
        overlap = chunk_size // 2

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - overlap
    return chunks
