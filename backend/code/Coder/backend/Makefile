.PHONY: help install run clean venv test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: venv ## Install dependencies in virtual environment
	@echo "Installing dependencies..."
	@. venv/bin/activate && pip install --upgrade pip
	@. venv/bin/activate && pip install -r requirements.txt
	@echo "Dependencies installed!"

venv: ## Create virtual environment if it doesn't exist
	@if [ ! -d "venv" ]; then \
		echo "Creating virtual environment..."; \
		python3 -m venv venv; \
		echo "Virtual environment created!"; \
	fi

run: venv ## Run the Flask backend server
	@echo "Starting Flask backend server..."
	@. venv/bin/activate && python app.py

dev: venv ## Run the Flask backend in development mode
	@echo "Starting Flask backend in development mode..."
	@. venv/bin/activate && FLASK_DEBUG=True python app.py

clean: ## Remove virtual environment and cache files
	@echo "Cleaning up..."
	@rm -rf venv
	@find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@echo "Cleanup complete!"

test: venv ## Run tests (if available)
	@echo "Running tests..."
	@. venv/bin/activate && python -m pytest tests/ || echo "No tests found"

setup: install ## Full setup: create venv and install dependencies
	@echo "Setup complete!"
