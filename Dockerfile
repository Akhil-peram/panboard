# Use a slim, production-ready official Python image
FROM python:3.11-slim

# Set system-level environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set the container's working directory
WORKDIR /app

# Copy dependency specifications from the backend folder
COPY backend/requirements.txt .

# Install packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code into /app
COPY backend/ .

# Ensure the cache folder exists and has correct permissions
RUN mkdir -p data_cache && chmod -R 777 data_cache

# Expose the API port
EXPOSE 8000

# Run the FastAPI server with multi-worker scaling
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
