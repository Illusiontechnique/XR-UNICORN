# webXRunicorn — Modernized Branch

This branch (`modernize-threejs`) contains preliminary modernization work for the original webXRunicorn project. Changes so far:

- Replaced deprecated `THREE.Geometry` usage in `js/Recticle.js` and `js/Reticle.js` with `BufferGeometry`.
- Created a local git repository and committed the current project on branch `modernize-threejs`.
- Added this README and a `CHANGELOG.md` with an initial entry.

Next recommended steps:

1. Upgrade Three.js to a modern release and switch loaders to ES module versions (`examples/jsm/loaders/GLTFLoader.js`).
2. Migrate scripts to ES modules and update `index.html`/`debug.html` to use `type="module"` or use a bundler (Vite recommended).
3. Test WebXR flows from an HTTPS origin (localhost is recognized as secure for development).
4. Optimize and consolidate assets to avoid CORS and reduce load times (use `.glb`, Draco, KTX2 as needed).

To publish this branch as a new private GitHub repo named "unicorn-XR" run the commands below locally (you will authenticate in your browser):

```bash
# Create private repo with gh (GitHub CLI):
# gh repo create unicorn-XR --private --source=. --remote=origin --push

# Or manually create remote then push:
# 1) Create a new private repo on GitHub named unicorn-XR via the website
# 2) Then run these commands locally:
# git remote add origin https://github.com/<your-username>/unicorn-XR.git
# git push -u origin modernize-threejs
```

If you want me to prepare further automated changes (Vite scaffold, ES module migration), tell me which step to do next.

## New root helper scripts (fool-proof)

At root you can now run:

- `npm run start` (starts local dev server at http://localhost:5173)
- `npm run restart` (rebuild then start)
- `npm run update` (git pull + install deps)
- `npm run update-run` (update then start)

Native scripts:

- Windows: `start.bat`, `restart.bat`, `update_and_run.bat`
- macOS / Linux: `start.sh`, `restart.sh`, `update_and_run.sh`

⚠️ Project files are now under `app/` for easier root-level maintenance.
