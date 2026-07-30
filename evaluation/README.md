# ChunkRace — Scoring Engine

Scoring service for **ChunkRace**, a 4-hour RAG mini-hackathon (École Nationale d'Informatique, Université de Fianarantsoa). This repository covers the **A2 track**: the engine that judges participants' RAG answers against expected answers, enforces the anti-oracle rule, and produces the live leaderboard.

It does not generate answers (no LLM call happens here) — it only compares an already-generated answer to an expected one, and turns that comparison into a score.

## How it works, in one paragraph

A participant's RAG pipeline produces an answer to a fixed question. This service embeds both the generated answer and the expected answer, computes their cosine similarity, and classifies the result into one of three zones: `pass` (≥0.75), `gray` (0.60–0.75, flagged for human review), or `fail` (<0.60). Scores are aggregated per submission, persisted, and exposed through a small HTTP API and a leaderboard endpoint.

## Project structure

```
chunkrace-scoring/
├── pyproject.toml
├── data/
│   └── expected_answers.json   # question_id -> expected answer (swap for the real dataset from Person A1)
├── src/
│   └── scoring/
│       ├── engine.py           # embedding, cosine similarity, zone classification
│       ├── dataset.py          # loads expected answers from data/expected_answers.json
│       ├── ranking.py          # best-submission and leaderboard sorting logic
│       ├── storage.py          # SQLite persistence
│       └── api.py              # FastAPI service (/submit, /leaderboard, /health)
└── tests/
    ├── test_engine.py
    ├── test_ranking.py
    └── test_storage.py
```

## Requirements

- Python ≥ 3.14
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
uv sync
```

The first run of the service will download the embedding model (`all-MiniLM-L6-v2` by default, ~90MB) from the Hugging Face Hub and cache it locally. Do this **before** event day, then run offline (see below).

## Running the service

```bash
uv run uvicorn scoring.api:app --reload --app-dir src
```

Service listens on `http://127.0.0.1:8000` by default.

### Running fully offline (recommended for event day)

Once the embedding model has been downloaded once, force the service to skip any Hugging Face Hub network call:

```bash
export HF_HUB_OFFLINE=1
uv run uvicorn scoring.api:app --app-dir src
```

## API summary

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check |
| `/submit` | POST | Submit a participant's answers for scoring |
| `/leaderboard` | GET | Current ranking (best submission per participant) |

See `SYSTEM.md` for full request/response schemas, the anti-oracle mechanism, and the data model.

## Running tests

```bash
uv run python tests/test_engine.py
uv run python tests/test_ranking.py
uv run python tests/test_storage.py
```

These are simple executable scripts (not pytest-based) that print `[OK]` / `[MISMATCH]` per case — sufficient for solo development; consider migrating to `pytest` before the cross-team integration test if the team wants a unified test run.

## Known limitations / open items

- Embedding model (`all-MiniLM-L6-v2`) is a placeholder — must match whatever model the RAG starter kit (Person B) uses, or similarity scores are meaningless.
- Zone thresholds (0.75 / 0.60) are calibrated on placeholder examples only, not the real dataset.
- `data/expected_answers.json` currently holds placeholder questions — replace with the real dataset from Person A1 before the cross-team dry run.
- No CORS configuration yet — required before a separate frontend origin can call this service from a browser.
- No automated export of the final leaderboard (e.g. to a file) — `/leaderboard` is the only current output.

## License

Internal project for ChunkRace — no license specified.
