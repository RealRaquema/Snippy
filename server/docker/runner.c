#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int main() {
    FILE *file = fopen("/app/main.c", "r");
    if (!file) {
        fprintf(stderr, "Error: Could not open source file\n");
        return 1;
    }

    // Compile the code
    int compile_result = system("gcc -o /app/program /app/main.c");
    if (compile_result != 0) {
        fprintf(stderr, "Compilation failed\n");
        return 1;
    }
    
    // Run the compiled program
    fclose(file);
    
    execl("/app/program", "program", NULL);
    
    // If execl returns, there was an error
    perror("Failed to execute program");
    return 1;
}