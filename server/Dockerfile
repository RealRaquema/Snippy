FROM node:18-bullseye-slim

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install runtimes and build tools: OpenJDK 17, Python3, GCC/G++ and common tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       wget \
       gnupg \
       software-properties-common \
       lsb-release \
       build-essential \
       gcc \
       g++ \
       python3 \
       python3-pip \
       openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME for processes inside the container
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

# Copy package manifests and install node deps first for caching
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Ensure temp runner folder exists and is writable
RUN mkdir -p /app/server/runners/temp && chmod -R 777 /app/server/runners/temp

EXPOSE 5000

CMD ["npm", "start"]