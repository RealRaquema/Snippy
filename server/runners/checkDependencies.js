const { spawnSync } = require('child_process');

function checkDependencies() {
    // Check Java
    const java = spawnSync('java', ['-version']);
    if (java.error) {
        console.error('Java is not installed or not accessible');
        console.error('Please install Java JDK to enable Java code execution');
    } else {
        console.log('Java is available');
    }

    // Check Python
    const python = spawnSync('python3', ['-V']);
    if (python.error) {
        console.error('Python3 is not installed or not accessible');
        console.error('Please install Python3 to enable Python code execution');
    } else {
        console.log('Python is available');
    }

    // Check GCC for C/C++
    const gcc = spawnSync('gcc', ['-v']);
    if (gcc.error) {
        console.error('GCC is not installed or not accessible');
        console.error('Please install GCC to enable C/C++ code execution');
    } else {
        console.log('GCC is available');
    }
}

module.exports = checkDependencies;