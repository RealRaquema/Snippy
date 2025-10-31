const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DockerManager {
    constructor() {
        // Try different Docker socket configurations
        const socketPaths = [
            {}, // Default configuration
            { socketPath: '/var/run/docker.sock' },
            { socketPath: '//./pipe/docker_engine' }, // Windows named pipe
            { host: 'localhost', port: 2375 } // TCP (if configured)
        ];

        for (const config of socketPaths) {
            try {
                this.docker = new Docker(config);
                // Test the connection
                this.docker.ping().catch(() => {
                    throw new Error('Docker connection failed');
                });
                break;
            } catch (error) {
                console.log(`Failed to connect to Docker with config:`, config);
                if (config === socketPaths[socketPaths.length - 1]) {
                    throw new Error('Could not connect to Docker. Please ensure Docker is running and properly configured.');
                }
            }
        }
        
        this.containers = new Map();
        this._wasTimeout = false; // Track retry state for Java
    }

    async runCode(language, code) {
        const containerId = uuidv4();
        const tempDir = path.join(__dirname, 'temp', containerId);
        
        try {
            // Create temp directory
            await fs.mkdir(tempDir, { recursive: true });
            
            // Write code to appropriate file with proper line endings
            const fileName = this._getFileName(language);
            let normalizedCode = code;
            
            if (language === 'c' || language === 'cpp') {
                // For C/C++, replace string literal newlines with raw backslash-n
                normalizedCode = code
                    .replace(/"([^"\\]|\\[^"])*"/g, match => {
                        // Replace all escaped newlines in string literals
                        return match.replace(/\r\n|\r|\n/g, '\\n');
                    })
                    .replace(/\r\n|\r|\n/g, '\n');  // Then normalize all other newlines
            } else {
                // For other languages, just normalize line endings
                normalizedCode = code.replace(/\r\n|\r|\n/g, '\n');
            }
            
            await fs.writeFile(path.join(tempDir, fileName), normalizedCode);
            
            // Build and run container
            const container = await this._createContainer(language, tempDir);
            this.containers.set(containerId, container);
            
            // Get timeout based on language
            const timeout = this._getTimeout(language);
            const result = await this._runWithTimeout(container, timeout);
            
            // Format output and error message
            let formattedOutput = result.output;
            try {
                // Try to clean up ANSI escape codes and normalize line endings
                formattedOutput = result.output
                    .replace(/\x1B\[\d+(?:;\d+)*[a-zA-Z]/g, '') // Remove ANSI escape codes
                    .replace(/\x1B\[\d*[a-zA-Z]/g, '')         // Remove any remaining ANSI codes
                    .replace(/\r\n/g, '\n')                    // Normalize line endings
                    .trim();
            } catch (e) {
                console.error('Error formatting output:', e);
            }

            return { 
                success: result.exitCode === 0,
                output: formattedOutput,
                error: result.exitCode !== 0 
                    ? (formattedOutput.includes('Compilation failed') || formattedOutput.includes('error:') 
                        ? 'Compilation failed' : 'Execution failed')
                    : null
            };
        } catch (error) {
            // Provide more descriptive error messages
            let errorMessage = error.message;
            if (error.message.includes('ENOENT') && error.message.includes('docker.sock')) {
                errorMessage = 'Docker is not running or not accessible. Please ensure Docker is started and running properly.';
            } else if (error.message.includes('image') && error.message.includes('not found')) {
                errorMessage = `Docker image for ${language} not found. Please run the build-images.sh script first.`;
            }
            return { 
                success: false, 
                error: errorMessage,
                details: error.message // Include original error for debugging
            };
        } finally {
            // Cleanup
            await this._cleanup(containerId, tempDir);
        }
    }

    _getFileName(language) {
        switch(language) {
            case 'python': return 'main.py';
            case 'cpp': return 'main.cpp';
            case 'c': return 'main.c';
            case 'java': return 'Main.java';
            default: throw new Error('Unsupported language');
        }
    }

    _getTimeout(language) {
        switch(language) {
            case 'java': return 30000;  // 30s for Java's slow startup
            case 'python': return 5000;  // 5s for Python
            case 'c':
            case 'cpp': return 10000;    // 10s for C/C++ compilation
            default: throw new Error('Unsupported language');
        }
    }

    async _createContainer(language, codeDir) {
        const fileName = this._getFileName(language);
        
        // Create container with strict resource limits and volume mount
        return await this.docker.createContainer({
            Image: `code-runner-${language}:latest`,
            HostConfig: {
                Memory: 100 * 1024 * 1024, // 100MB memory limit
                MemorySwap: 100 * 1024 * 1024, // Disable swap
                CpuPeriod: 100000,
                CpuQuota: 50000, // 50% CPU limit
                NetworkMode: 'none', // Disable network
                AutoRemove: true,
                Binds: [`${codeDir}/${fileName}:/app/${fileName}`]
            },
            NetworkDisabled: true,
            Tty: true,
            AttachStdout: true,
            AttachStderr: true
        });
    }

    async _runWithTimeout(container, timeout) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(async () => {
                try {
                    await container.stop();
                    reject(new Error('Execution timed out'));
                } catch (error) {
                    reject(error);
                }
            }, timeout);

            try {
                await container.start();
                const stream = await container.attach({
                    stream: true,
                    stdout: true,
                    stderr: true
                });

                let output = '';
                stream.on('data', (chunk) => {
                    output += chunk.toString('utf8');
                });

                const result = await container.wait();
                clearTimeout(timeoutId);
                
                // Wait a bit for any remaining output
                await new Promise(resolve => setTimeout(resolve, 100));
                
                resolve({
                    exitCode: result.StatusCode,
                    output: output
                });
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    async _cleanup(containerId, tempDir) {
        // Handle container cleanup
        let container = this.containers.get(containerId);
        if (container) {
            try {
                await container.stop();
                await container.remove({ force: true });
            } catch (error) {
                // Ignore common cleanup errors
                if (!error.message?.includes('no such container') && 
                    !error.message?.includes('already in progress') &&
                    !error.message?.includes('already stopped')) {
                    console.error('Container cleanup error:', error);
                }
            }
            this.containers.delete(containerId);
        }
        
        // Handle temp directory cleanup
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Directory cleanup error:', error);
            }
        }
    }

    async stopContainer(containerId) {
        const container = this.containers.get(containerId);
        if (container) {
            await this._cleanup(containerId);
        }
    }
}

module.exports = DockerManager;