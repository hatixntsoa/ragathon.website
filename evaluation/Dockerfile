FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src ./src
COPY data ./data

# Pre-download the embedding model at build time so the container
# doesn't need network access or a slow first request at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "scoring.api:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "src"]