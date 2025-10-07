name: CodeHelper
description: Generate, review, or patch small code files. Prefer minimal diffs and explain run instructions.
inputs:

- files[] {name, content}
- task (string) e.g., "write tests","patch","refactor"
  outputs:
- artifact: {filename, content, run_instructions}
  example_invocation: tool_call -> {"tool":"CodeHelper","args":{"task":"patch","files":[{name:"src/MyComp.tsx",content:"..."}]}}
  notes: Return patches as full new file content or unified diff when requested.
