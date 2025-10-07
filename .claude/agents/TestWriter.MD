name: TestWriter
description: Write unit & integration tests for React Native + TypeScript using Jest and React Native Testing Library.
inputs:

- files[] {name, content}
- scope ("unit"|"integration")
  outputs:
- artifact: {filename, content, run_instructions}
  example_invocation: tool_call -> {"tool":"TestWriter","args":{"scope":"unit","files":[{name:"src/MyComp.tsx",content:"..."}]}}
  notes: Keep tests focused and runnable; include mock instructions if needed.
