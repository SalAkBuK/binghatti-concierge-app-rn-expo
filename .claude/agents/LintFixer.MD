name: LintFixer
description: Produce lint rules, ESLint fixes, and pre-commit hooks for TS + RN.
inputs:

- files[] {name, content}
- task e.g., "fix lint error"
  outputs:
- artifact: {patches, eslint_config, run_instructions}
  example_invocation: tool_call -> {"tool":"LintFixer","args":{"files":[{name:".eslintrc.js",content:"..."}],"task":"fix error"}}
  notes: Prefer small patches and explain why.
