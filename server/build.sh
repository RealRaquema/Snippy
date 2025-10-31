#!/bin/bash
# This script installs required compilers and runtimes on Render

echo "Starting installation of required compilers and runtimes..."

# Update package lists
apt-get update

# Install Python3 and compilers
apt-get install -y python3 python3-pip gcc g++

# Create directory for code execution
mkdir -p /app/server/runners/temp
chmod 777 /app/server/runners/temp

# Verify installations
echo "Checking installations..."
echo "Python version:"
python3 --version
echo "GCC version:"
gcc --version
echo "G++ version:"
g++ --version

echo "Installation and verification complete!"