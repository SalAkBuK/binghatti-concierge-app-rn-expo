name: HumanEscalation
description: Format a concise support ticket or engineering summary for manual review.
inputs: {context, urgency}
outputs: {summary, details, suggested_next_steps, priority}
example_invocation: tool_call -> {"tool":"HumanEscalation","args":{"context":"low-confidence security risk","urgency":"high"}}
notes: Keep to 6-10 lines, include critical files/lines.
