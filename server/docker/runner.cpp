#include <iostream>
#include <cstdlib>
#include <string>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    // Check if main.cpp exists
    if (access("/app/main.cpp", F_OK) != 0) {
        std::cerr << "Error: /app/main.cpp not found\n";
        return 2;
    }

    // Compile the code
    int compile_result = system("g++ -o /app/program /app/main.cpp");
    if (compile_result != 0) {
        std::cerr << "Compilation failed with exit code " << compile_result << "\n";
        return 1;
    }

    // Execute the compiled program
    execl("/app/program", "program", nullptr);
    
    // If execl returns, there was an error
    perror("Failed to execute program");
    return 1;
}