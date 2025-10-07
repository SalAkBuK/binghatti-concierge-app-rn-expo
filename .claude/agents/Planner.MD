name: Planner
description: Create step-by-step implementation plans and acceptance criteria for feature work or refactors.
inputs: {goal, constraints}
outputs: plan: [{step, estimate_days, acceptance_criteria}]
example_invocation: tool_call -> {"tool":"Planner","args":{"goal":"add streaming chat"}}
