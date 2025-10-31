#!/bin/bash
# This script installs required compilers and runtimes on Render

# Update package lists
apt-get update

# Install Java JDK
apt-get install -y default-jdk

# Install Python3
apt-get install -y python3

# Install GCC and G++
apt-get install -y gcc g++

# Verify installations
echo "Checking installations..."
java -version
python3 --version
gcc --version
g++ --version