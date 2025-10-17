PYTHON?=${VIRTUAL_ENV}/bin/python
PACKAGE=stegresearch

.PHONY: setup lint fmt test bench run-api examples docs

setup:
	python3 -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip
	. .venv/bin/activate && pip install -e .[dev]

lint:
	. .venv/bin/activate && ruff check src tests
	. .venv/bin/activate && mypy src

fmt:
	. .venv/bin/activate && ruff check --select I --fix src tests
	. .venv/bin/activate && black src tests

test:
	. .venv/bin/activate && pytest

bench:
	. .venv/bin/activate && python -m src.core.benchmarks

run-api:
	. .venv/bin/activate && uvicorn src.api.app:app --reload

examples:
	. .venv/bin/activate && python -m examples.run_all

docs:
	. .venv/bin/activate && mkdocs serve
