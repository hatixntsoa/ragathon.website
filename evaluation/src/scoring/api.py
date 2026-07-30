from fastapi import FastAPI
from pydantic import BaseModel

from scoring.dataset import load_expected_answers
from scoring.engine import Zone, classify_zone, similarity_score

app = FastAPI()

EXPECTED_ANSWERS: dict[str, str] = {}
MAX_SUBMISSIONS = 2


class ScoreRequest(BaseModel):
    answers: dict[str, str]


class QuestionResult(BaseModel):
    question_id: str
    expected: str
    generated: str
    similarity: float
    zone: str


class ScoreResponse(BaseModel):
    score: int
    total: int
    zone_breakdown: dict[str, int]
    questions: list[QuestionResult]


@app.on_event("startup")
def on_startup() -> None:
    global EXPECTED_ANSWERS
    EXPECTED_ANSWERS = load_expected_answers()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "questions_loaded": str(len(EXPECTED_ANSWERS))}


@app.get("/config")
def config() -> dict:
    return {"max_submissions": MAX_SUBMISSIONS}


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    questions: list[QuestionResult] = []
    for question_id, expected in EXPECTED_ANSWERS.items():
        generated = req.answers.get(question_id, "")
        similarity = similarity_score(expected, generated)
        zone = classify_zone(similarity)
        questions.append(
            QuestionResult(
                question_id=question_id,
                expected=expected,
                generated=generated,
                similarity=round(similarity, 4),
                zone=zone.value,
            )
        )

    breakdown = {
        "pass": sum(1 for q in questions if q.zone == Zone.PASS.value),
        "gray": sum(1 for q in questions if q.zone == Zone.GRAY.value),
        "fail": sum(1 for q in questions if q.zone == Zone.FAIL.value),
    }
    return ScoreResponse(
        score=breakdown["pass"],
        total=len(EXPECTED_ANSWERS),
        zone_breakdown=breakdown,
        questions=questions,
    )