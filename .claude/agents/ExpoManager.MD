name: ExpoManager
description: Advise on Expo config, EAS build settings, and common Expo tasks (expo start, eas build).
inputs:

- files[] {name, content}
- task e.g., "optimize build","update sdk"
  outputs:
- artifact: {advice, commands, config_patches}
  example_invocation: tool_call -> {"tool":"ExpoManager","args":{"task":"optimize build","files":[{name:"app.json",content:"..."}]}}
  notes: Do not run commands; produce exact CLI commands and config diffs.
