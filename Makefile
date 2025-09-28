SHELL := /bin/bash

.PHONY: help venv install run freeze fmt lint clean

VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.DEFAULT_GOAL := help

help: ## Show available make targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' Makefile | awk 'BEGIN{FS=":.*?## "}{printf "%-15s %s\n", $$1, $$2}'

venv: ## Create a local virtual environment (.venv)
	@test -d $(VENV) || python3 -m venv $(VENV)
	@$(PIP) -V

install: venv ## Install dependencies (requirements.txt if present, otherwise core deps)
	@if [ -f requirements.txt ]; then \
		$(PIP) install -r requirements.txt; \
	else \
		$(PIP) install flask pandas pyyaml openai; \
	fi

freeze: venv ## Freeze current environment to requirements.txt
	@$(PIP) freeze > requirements.txt

run: venv ## Run the Flask app
	@$(PY) app.py

fmt: venv ## Format code with Black
	@$(PIP) install black >/dev/null 2>&1 || true
	@$(VENV)/bin/black .

lint: venv ## Lint code with flake8
	@$(PIP) install flake8 >/dev/null 2>&1 || true
	@$(VENV)/bin/flake8 . || true

clean: ## Remove Python caches and temporary files
	rm -rf __pycache__ **/__pycache__ .pytest_cache .mypy_cache
.PHONY: install run

install:
	pip install -r requirements.txt

run:
	python app.py
