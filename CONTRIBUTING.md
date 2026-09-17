# Contributing to 2FA Manager

For bugs, include the steps to reproduce the problem, what you expected, what happened, and your browser version. For changes to behavior, open an issue to describe the use case before starting a large pull request.

Use dummy accounts and secrets in examples. Never include a real setup secret, provisioning URI, recovery code, or backup file in an issue or pull request.

## Local setup

Follow [Run locally](README.md#run-locally), then make a focused change on a branch.

```bash
pnpm test
pnpm check
pnpm build
```

For interface changes, check desktop and mobile widths and include screenshots using dummy accounts. For token generation or backup changes, add tests for the behavior you change.

Explain the problem your pull request solves and how you checked it. Keep unrelated formatting changes out of the diff.

## Where to start

- `src/routes/index.tsx` contains the account list, code display, and token form.
- `src/hooks/useTokenVault.ts` manages local storage, accounts, and backups.
- `src/lib/totp.ts` calculates codes and parses provisioning URIs.
- `src/lib/tokenAccounts.ts` handles account records and JSON imports.
- `src/styles.css` defines the interface styling.

The repository does not currently include a license. Do not assume it grants permission to redistribute or reuse the code under an open-source license.
