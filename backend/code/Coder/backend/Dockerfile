FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including NVIDIA drivers detection tools
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_DEBUG=False
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:////app/data/coder.db

# Run the application
CMD ["python", "app.py"]
