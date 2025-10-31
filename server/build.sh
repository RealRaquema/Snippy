#!/bin/bash
# This script installs required compilers and runtimes on Render

echo "Starting installation of required compilers and runtimes..."

# Update package lists
apt-get update

# Add adoptium repository for OpenJDK
apt-get install -y wget apt-transport-https
mkdir -p /etc/apt/keyrings
wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list

# Update package lists again after adding new repository
apt-get update

# Install OpenJDK 17
apt-get install -y temurin-17-jdk

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
echo "export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64" >> /etc/environment
echo "export PATH=$JAVA_HOME/bin:$PATH" >> /etc/environment
source /etc/environment

# Install Python3
apt-get install -y python3

# Install GCC and G++
apt-get install -y gcc g++

# Create directory for code execution
mkdir -p /app/server/runners/temp
chmod 777 /app/server/runners/temp

# Verify installations
echo "Checking installations..."
echo "Java version:"
java -version
echo "Java location:"
which java
echo "JAVA_HOME:"
echo $JAVA_HOME
echo "Python version:"
python3 --version
echo "GCC version:"
gcc --version
echo "G++ version:"
g++ --version

# Test Java compilation
echo "Testing Java compilation..."
echo "public class Test { public static void main(String[] args) { System.out.println(\"Test\"); } }" > Test.java
javac Test.java
java Test
rm Test.java Test.class

echo "Installation and verification complete!"