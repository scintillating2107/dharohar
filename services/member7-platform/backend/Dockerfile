# Member 7 platform image — runs Member 6 FastAPI (services/member6-database).
# Build context: services/ (parent of member7-platform and member6-database).

FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY member6-database/requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN addgroup --system dharohar && adduser --system --ingroup dharohar dharohar

COPY member6-database/app ./app
COPY member6-database/scripts ./scripts

RUN mkdir -p /app/storage /app/uploads \
 && chown -R dharohar:dharohar /app

USER dharohar

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
