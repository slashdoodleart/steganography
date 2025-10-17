# Quickstart

!!! warning
    This suite is strictly for lawful research in controlled environments. Do not target external systems or networks.

## Prerequisites

- Python 3.11
- FFmpeg installed locally
- Virtual environment (recommended)

## Setup Steps

```bash
make setup
```

## Generate synthetic corpora

```bash
. .venv/bin/activate
python -m src.datasets.generate --all --seed 1337 --output data/synthetic
```

## Run tests and benchmarks (under 10 minutes on CPU-only machines)

```bash
make test
make bench
```

## Launch the API

```bash
make run-api
```

The API exposes endpoints at `http://localhost:8000` and serves its OpenAPI schema at `/docs`.
