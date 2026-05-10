import re
from uuid import uuid4

from backend.app.domain.models import RagChunk


RAG_CHUNK_SIZE = 900


def normalize_source_text(value: str) -> str:
    stripped_lines = [line.strip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    text = "\n".join(line for line in stripped_lines if line)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def split_text(value: str, chunk_size: int = RAG_CHUNK_SIZE) -> list[str]:
    text = normalize_source_text(value)
    if not text:
        return []

    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", text) if paragraph.strip()]
    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def append_chunk(parts: list[str]) -> None:
        chunk_text = "\n\n".join(parts).strip()
        if chunk_text:
            chunks.append(chunk_text)

    for paragraph in paragraphs:
        paragraph_length = len(paragraph)

        if paragraph_length > chunk_size:
            if current_parts:
                append_chunk(current_parts)
                current_parts = []
                current_length = 0
            for start in range(0, paragraph_length, chunk_size):
                append_chunk([paragraph[start : start + chunk_size]])
            continue

        next_length = current_length + paragraph_length
        if current_parts and next_length > chunk_size:
            append_chunk(current_parts)
            current_parts = [paragraph]
            current_length = paragraph_length
            continue

        current_parts.append(paragraph)
        current_length = next_length

    if current_parts:
        append_chunk(current_parts)

    return chunks


def build_rag_chunks(
    *,
    knowledge_base_id: str,
    source_type: str,
    source_id: str,
    title: str,
    section_heading: str,
    text: str,
) -> list[RagChunk]:
    return [
        {
            "id": f"chunk-{uuid4().hex}",
            "knowledgeBaseId": knowledge_base_id,
            "sourceType": source_type,
            "sourceId": source_id,
            "title": title,
            "sectionHeading": section_heading,
            "position": index,
            "text": chunk_text,
            "qdrantPointId": str(uuid4()),
            "metadata": {"aclRoles": ["reader", "editor", "admin"]},
        }
        for index, chunk_text in enumerate(split_text(text))
    ]
