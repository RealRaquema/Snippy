Cleanup actions completed and remaining manual steps

What I removed in this pass

- Removed Java language support from client UI (`client/src/pages/CodeEditor.jsx`).
- Removed Java runner code from server (`server/runners/CodeRunner.js`, `server/runners/checkDependencies.js`, and removed Java handling in `server/index.js`).
- Deleted Docker-based language artifacts earlier (server/docker folder) to simplify runtime.
- Updated server Dockerfile and build script to not install Java (per user request).

Remaining files with Java references

- `client/package-lock.json` still contains references to `@codemirror/lang-java` and `@lezer/java` (leftover from previous installs).

Why it remains

- I was unable to safely and reliably regenerate or delete `client/package-lock.json` in this environment. The easiest and safest next step is to regenerate it locally so it matches your current `client/package.json`.

Recommended final steps (run locally on your machine)

1) Remove the stale lockfile and regenerate deps in the client folder:

```bash
cd client
rm package-lock.json        # on Windows bash: rm package-lock.json
npm install                # regenerates package-lock.json without Java
npm run build              # optional: rebuild the client
```

2) Rebuild the server image (optional but recommended to validate runtimes):

```bash
# from repo root
docker build -t snippy-server:local -f server/Dockerfile server
# run it with your mongo URL and any env vars
docker run --rm -p 5000:5000 -e MONGO_URL="<your-mongo-url>" snippy-server:local
```

3) Test the /api/run endpoints for supported languages (javascript, python, c, cpp).

Notes and rationale

- I intentionally removed Java runtime support per your last instruction to avoid spawn/ENOENT errors on Render.
- The client now only exposes JavaScript/Python/C/C++ in the language selector.
- Deleting and regenerating the client lockfile locally will remove leftover Java packages permanently.

If you want, I can:
- regenerate a clean `client/package-lock.json` here, but that would require running `npm install` in the environment (I can’t run installs that modify the network state without your go-ahead), or
- continue hunting any other minor references (I already searched the repo and the only remaining real artifact was the client lockfile).

Tell me how you'd like to proceed: I can try to regenerate the lockfile for you, or guide you step-by-step to run the three commands above locally and verify the app on Render.
