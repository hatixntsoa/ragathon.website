from enum import Enum

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# TODO : rate limit less 10/minute

# Placeholder model — MUST be swapped for whatever B's starter kit
# actually uses in the RAG pipeline, or scores won't be comparable.
EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

_model = SentenceTransformer(EMBEDDING_MODEL_NAME)


class Zone(Enum):
    PASS = "pass"
    GRAY = "gray"
    FAIL = "fail"


def similarity_score(expected: str, generated: str) -> float:
    """Cosine similarity between expected and generated answers, in [0, 1]."""
    vectors = _model.encode([expected, generated])
    score = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
    return float(score)


def classify_zone(
    score: float, pass_threshold: float = 0.75, fail_threshold: float = 0.60
) -> Zone:
    if score >= pass_threshold:
        return Zone.PASS
    if score >= fail_threshold:
        return Zone.GRAY
    return Zone.FAIL
