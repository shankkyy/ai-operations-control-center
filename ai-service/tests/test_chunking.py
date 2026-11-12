from app.services.chunking import chunk_text


def test_empty_text_returns_no_chunks():
    assert chunk_text("", chunk_size=10, overlap=2) == []


def test_short_text_is_single_chunk():
    chunks = chunk_text("one two three", chunk_size=10, overlap=2)
    assert chunks == ["one two three"]


def test_chunks_overlap():
    words = " ".join(f"w{i}" for i in range(10))
    chunks = chunk_text(words, chunk_size=4, overlap=1)
    assert len(chunks) > 1
    # last word of one chunk should reappear as first word of the next (overlap=1)
    first_chunk_words = chunks[0].split()
    second_chunk_words = chunks[1].split()
    assert first_chunk_words[-1] == second_chunk_words[0]


def test_overlap_clamped_below_chunk_size():
    chunks = chunk_text("a b c d e f", chunk_size=3, overlap=5)
    assert all(len(c.split()) <= 3 for c in chunks)
