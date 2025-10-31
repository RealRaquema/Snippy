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
    && rm -rf /var/lib/apt/lists/*

# No Java runtime: Java support removed. Keep Python and compilers only.

# Copy package manifests and install node deps first for caching
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Ensure temp runner folder exists and is writable
RUN mkdir -p /app/server/runners/temp && chmod -R 777 /app/server/runners/temp

EXPOSE 5000

CMD ["npm", "start"]