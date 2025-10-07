name: DependencyAdvisor
description: Inspect package.json, recommend dependency upgrades or removals and give exact install commands.
inputs:

- package_json (object or text)
  outputs:
- artifact: {recommendations:[{pkg,from,to,reason}], commands:[ "yarn add ..."] }
  example_invocation: tool_call -> {"tool":"DependencyAdvisor","args":{"package_json":"{...}"}}
  notes: Flag breaking changes and propose migration steps.
