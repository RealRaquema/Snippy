import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class Runner {
    public static void main(String[] args) {
        Path src = Paths.get("/app/Main.java");
        try {
            if (!Files.exists(src)) {
                System.err.println("Error: /app/Main.java not found");
                System.exit(2);
            }

            // Compile Main.java
            ProcessBuilder compilePb = new ProcessBuilder("javac", "Main.java");
            compilePb.directory(new File("/app"));
            Process compile = compilePb.start();
            int cExit = compile.waitFor();
            String cOut = readStream(compile.getInputStream());
            String cErr = readStream(compile.getErrorStream());
            if (cOut.length() > 0) System.out.print(cOut);
            if (cErr.length() > 0) System.err.print(cErr);
            if (cExit != 0) {
                System.err.println("Compilation failed with exit code " + cExit);
                System.exit(cExit);
            }

            // Run the compiled Main class with a limited environment
            ProcessBuilder runPb = new ProcessBuilder("java", "-cp", ".", "Main");
            runPb.directory(new File("/app"));
            Process run = runPb.start();

            // Stream stdout
            Thread outThread = new Thread(() -> {
                try { System.out.print(readStream(run.getInputStream())); } catch (IOException ignored) {}
            });
            // Stream stderr
            Thread errThread = new Thread(() -> {
                try { System.err.print(readStream(run.getErrorStream())); } catch (IOException ignored) {}
            });
            outThread.start();
            errThread.start();

            int rExit = run.waitFor();
            outThread.join();
            errThread.join();
            System.exit(rExit);

        } catch (IOException | InterruptedException e) {
            System.err.println("Runner error: " + e.getMessage());
            System.exit(1);
        }
    }

    private static String readStream(java.io.InputStream is) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line).append('\n');
        }
        return sb.toString();
    }
}