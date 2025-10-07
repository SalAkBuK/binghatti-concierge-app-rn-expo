name: AssetOptimizer
description: Recommend or produce optimized image sizes, advise on expo-asset and preloading, and produce file-level suggestions.
inputs:

- assets[] {name, size_bytes, path}
  outputs:
- artifact: {actions: [{action, target, note}], commands}
  example_invocation: tool_call -> {"tool":"AssetOptimizer","args":{"assets":[{name:"icon.png",size_bytes:340000}]}}
  notes: Provide lossless/quality recommendations and exact scripts for resizing.
