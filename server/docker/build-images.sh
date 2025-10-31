#!/bin/bash

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running or not accessible. Please start Docker and try again."
    exit 1
fi

echo "Building Python image..."
docker build -t code-runner-python -f Dockerfile-python .

echo "Building C/C++ image..."
docker build -t code-runner-cpp -f Dockerfile-cpp .
docker build -t code-runner-c -f Dockerfile-cpp .

echo "Building Java image..."
docker build -t code-runner-java -f Dockerfile-java .

echo "All images built successfully!"