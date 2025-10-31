const { spawnSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CodeRunner {
    constructor() {
        this.runningProcesses = new Map();
    }

    async runPython(code) {
        const tempDir = path.join(__dirname, 'temp', uuidv4());
        const filePath = path.join(tempDir, 'main.py');
        
        try {
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(filePath, code);
            
            const process = spawnSync('python3', [filePath], {
                timeout: 5000,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 // 1MB output limit
            });

            return this._formatOutput(process);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }
    }

    async runJava(code) {
        const tempDir = path.join(__dirname, 'temp', uuidv4());
        const filePath = path.join(tempDir, 'Main.java');
        
        try {
            // Ensure the temp directory exists
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(filePath, code);
            
            // Check if Java is available
            const javaCheck = spawnSync('java', ['-version']);
            if (javaCheck.error) {
                return {
                    success: false,
                    error: 'Java is not installed or not accessible',
                    output: 'Java runtime is not available on the server.'
                };
            }
            
            // Compile with detailed error output
            const compilation = spawnSync('javac', [filePath], {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            if (compilation.status !== 0) {
                const errorOutput = compilation.stderr || compilation.stdout || 'Unknown compilation error';
                return {
                    success: false,
                    error: 'Compilation failed',
                    output: `Compilation Error:\n${errorOutput}`
                };
            }

            // Run with increased timeout for Java's slower startup
            const process = spawnSync('java', ['-cp', tempDir, 'Main'], {
                timeout: 10000, // Increased timeout to 10 seconds
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            // Format and return the output
            const result = this._formatOutput(process);
            
            // Add debugging information for non-success cases
            if (!result.success) {
                result.output = `Execution Output:\n${result.output}\n\nError Details:\n${result.error}`;
            }
            
            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }
    }

    async runCpp(code) {
        const tempDir = path.join(__dirname, 'temp', uuidv4());
        const sourcePath = path.join(tempDir, 'main.cpp');
        const execPath = path.join(tempDir, 'main');
        
        try {
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(sourcePath, code);
            
            // Compile
            const compilation = spawnSync('g++', [sourcePath, '-o', execPath], {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            if (compilation.status !== 0) {
                return {
                    success: false,
                    error: 'Compilation failed',
                    output: compilation.stderr
                };
            }

            // Run
            const process = spawnSync(execPath, [], {
                timeout: 5000,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            return this._formatOutput(process);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }
    }

    async runC(code) {
        const tempDir = path.join(__dirname, 'temp', uuidv4());
        const sourcePath = path.join(tempDir, 'main.c');
        const execPath = path.join(tempDir, 'main');
        
        try {
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(sourcePath, code);
            
            // Compile
            const compilation = spawnSync('gcc', [sourcePath, '-o', execPath], {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            if (compilation.status !== 0) {
                return {
                    success: false,
                    error: 'Compilation failed',
                    output: compilation.stderr
                };
            }

            // Run
            const process = spawnSync(execPath, [], {
                timeout: 5000,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });

            return this._formatOutput(process);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        }
    }

    _formatOutput(process) {
        if (process.error) {
            if (process.error.code === 'ETIMEDOUT') {
                return {
                    success: false,
                    error: 'Execution timed out',
                    output: ''
                };
            }
            return {
                success: false,
                error: process.error.message,
                output: ''
            };
        }

        const output = (process.stdout || '') + (process.stderr || '');
        return {
            success: process.status === 0,
            output: output.trim(),
            error: process.status !== 0 ? 'Execution failed' : null
        };
    }
}

module.exports = CodeRunner;