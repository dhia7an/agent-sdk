# Guardrails example

This sample demonstrates how to attach conversation guardrails to an agent. It configures:

- A request guardrail that blocks any outbound message containing the words `password` or `secret`.
- A response guardrail that blocks assistant replies containing code snippets.

Run it after building the package:

```bash
npm run preexample:guardrails
npm run example:guardrails
```

The script prints the final assistant message and the guardrail incidents captured for both a blocked request and a filtered response.
