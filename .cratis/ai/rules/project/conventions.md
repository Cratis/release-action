---
applyTo: "**/*"
---

## Conventions

- The action is a compiled TypeScript action; `yarn build` (per `package.json`)
  produces the bundle that must be committed for the action to run.
- Every consumer's release depends on this action — changes are released
  deliberately and backwards-compatibly where possible.
