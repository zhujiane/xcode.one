# Contributing

Open a pull request against `main`.

- Canvas templates: add a JSON file under `canvas-templates/`. Must be `schemaVersion: 1`. Do not include run history, model secrets, or local asset IDs.
- Node library: add a definition under `node-library/examples/` (or a reviewed folder) plus a short README if the node needs extra ports or config.
- Skills: add a folder under `skills/` with a `SKILL.md`. Keep steps generic. No private repos, keys, or personal paths.
- Do not commit app source, `.env`, tokens, or built installers. Installers belong in GitHub Releases.

One PR can group related templates, nodes, or skills. Do not mix unrelated changes.
