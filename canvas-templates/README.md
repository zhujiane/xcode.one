# Canvas templates

Open canvas workflows others can PR, plus maintained common flows.

Format matches the app definition (`schemaVersion: 1`):

- `nodes[]`: `id`, `type` (`script` | `image` | `video` | `audio` | `stt` | `publish`), `title`, `x`, `y`, `config`
- `config`: `prompt`, `modelId` (null = default model), `assetIds` (leave empty in templates), `size`, `voice`, `speed`, `seconds`
- `edges[]`: `id`, `fromId`, `toId`, `fromPort`, `toPort`, `order`, `label`, `outputId` (null)

Templates must not include run records, frozen `outputId`, or private model UUIDs.
