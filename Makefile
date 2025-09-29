SHELL := /bin/bash

.PHONY: help venv install run freeze fmt lint clean

VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
PYTHON ?= python3

.DEFAULT_GOAL := run

help: ## Show available make targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' Makefile | awk 'BEGIN{FS=":.*?## "}{printf "%-15s %s\n", $$1, $$2}'

venv: ## Create a local virtual environment (.venv)
	@test -d $(VENV) || $(PYTHON) -m venv $(VENV)
	@$(PIP) install -U pip >/dev/null 2>&1 || true
	@$(PIP) -V

install: venv ## Install dependencies (requirements.txt if present, otherwise core deps)
	@if [ -f requirements.txt ]; then \
		$(PIP) install -r requirements.txt; \
	else \
		$(PIP) install flask pandas pyyaml openai; \
	fi

run: install ## Run the Flask app
	@$(PY) app.py

freeze: venv ## Freeze current environment to requirements.txt
	@$(PIP) freeze > requirements.txt

fmt: venv ## Format code with Black
	@$(PIP) install black >/dev/null 2>&1 || true
	@$(VENV)/bin/black .

lint: venv ## Lint code with flake8
	@$(PIP) install flake8 >/dev/null 2>&1 || true
	@$(VENV)/bin/flake8 . || true

clean: ## Remove Python caches and temporary files
	rm -rf __pycache__ **/__pycache__ .pytest_cache .mypy_cache
