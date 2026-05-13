from types import SimpleNamespace

from backend.app.domain.models import RagChunk
from backend.app.infrastructure.rag.local import LocalRagService, _clean_model_answer


def _chunk(chunk_id: str, title: str, text: str) -> RagChunk:
    return {
        "id": chunk_id,
        "knowledgeBaseId": "kb-support",
        "sourceType": "page",
        "sourceId": f"page-{chunk_id}",
        "title": title,
        "sectionHeading": "Runbooks",
        "position": 0,
        "text": text,
        "qdrantPointId": f"point-{chunk_id}",
        "metadata": {},
    }


class FakeSemanticRagService(LocalRagService):
    def __init__(self) -> None:
        self.settings = SimpleNamespace(
            qdrant_url="http://qdrant.invalid",
            qdrant_collection="rag_chunks",
            ollama_base_url="http://ollama.invalid",
            ollama_chat_model="qwen3:4b",
            ollama_embed_model="embeddinggemma",
            rag_top_k=2,
            rag_min_score=0.75,
        )

    def _qdrant_search(self, question: str, query_embedding: list[float], base_id: str) -> list[dict[str, object]]:
        return []

    def _embed(self, values: list[str]) -> list[list[float]] | None:
        embeddings: list[list[float]] = []
        for value in values:
            normalized_value = value.casefold()
            if "восстановить доступ" in normalized_value:
                embeddings.append([1.0, 0.0, 0.0])
            elif "секретной фразы" in normalized_value:
                embeddings.append([0.98, 0.02, 0.0])
            elif "платеж" in normalized_value:
                embeddings.append([0.0, 1.0, 0.0])
            else:
                embeddings.append([0.0, 0.0, 1.0])
        return embeddings


def test_semantic_fallback_finds_chunk_without_direct_phrase_match() -> None:
    service = FakeSemanticRagService()
    chunks = [
        _chunk(
            "password",
            "Пароль",
            "Если пользователь забыл учетные данные, отправьте ему ссылку смены секретной фразы.",
        ),
        _chunk(
            "billing",
            "Биллинг",
            "Платежные документы выгружаются из раздела финансовых операций.",
        ),
    ]

    results = service.search("Как восстановить доступ к аккаунту?", "kb-support", chunks)

    assert results[0]["chunkId"] == "password"
    assert results[0]["score"] >= 0.75


def test_semantic_fallback_filters_low_similarity_chunks() -> None:
    service = FakeSemanticRagService()
    chunks = [
        _chunk(
            "billing",
            "Биллинг",
            "Платежные документы выгружаются из раздела финансовых операций.",
        )
    ]

    results = service.search("Как восстановить доступ к аккаунту?", "kb-support", chunks)

    assert results == []


def test_lexical_fallback_handles_broad_fish_recipe_query_without_embeddings() -> None:
    service = FakeSemanticRagService()
    service.settings.rag_min_score = 0.35
    service._embed = lambda values: None  # type: ignore[method-assign]
    chunks = [
        _chunk(
            "carbonara",
            "Спагетти карбонара",
            "Классическая паста с гуанчале и пекорино.",
        ),
        _chunk(
            "salmon",
            "Тальятелле с лососем и сливками",
            "Раздел: Море и рыба. Обжарьте кусочки лосося и смешайте с тальятелле.",
        ),
        _chunk(
            "shrimp",
            "Спагетти с креветками и лимоном",
            "Раздел: Море и рыба. Быстро обжарьте креветки с чесноком.",
        ),
    ]

    results = service.search("Расскажи про рецепты с рыбой", "kb-support", chunks)

    assert [result["chunkId"] for result in results] == ["salmon", "shrimp"]


def test_clean_model_answer_removes_thinking_block() -> None:
    answer = _clean_model_answer("<think>служебное рассуждение</think>\nОтвет по базе знаний.")

    assert answer == "Ответ по базе знаний."
