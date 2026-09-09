# Node library

Open node definitions. Built-in types stay in the closed app (`script`, `image`, `video`, `audio`, `stt`, `publish`).

A community node is a JSON descriptor the app can load later. It does not ship private generation code.

Required fields: `id`, `title`, `baseType` (one of the built-in types), `description`, `defaultPrompt`.
