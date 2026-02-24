# private_voting_dApp

A private voting dApp where voter identity remains private and votes are accepted only after ZK-proof validation.

## What's implemented

- **Noir circuit** in `circuits/private_vote.nr` proving:
  - eligible-member Merkle inclusion,
  - vote is boolean,
  - nullifier derivation,
  - vote commitment derivation.
- **Starknet voting contract** in `contracts/src/private_voting.cairo` with:
  - verifier integration,
  - nullifier replay protection,
  - admin-controlled election/root lifecycle.
- **Off-chain utilities** in `scripts/offchain/privateVoting.js` for:
  - Merkle tree/root and path generation,
  - witness/public input generation,
  - local circuit-rule simulation,
  - local voting-state replay checks.
- **Automated tests** in `test/privateVoting.test.js` for circuit constraints and replay behavior.

## Run tests

```bash
npm test
```

## Starknet build and test

```bash
npm run build-contracts
npm run test-contracts
npm run sync-addresses
```

## Frontend production build

```bash
cd frontend
npm run build
```

## Production readiness baseline

- Use a secret manager for `PRIVATE_KEY_SEPOLIA`; never commit real keys.
- Keep only template values in `.env.example`.
- Verify deployed contract addresses and class hashes before enabling voting.
- Rotate compromised keys immediately and redeploy affected accounts/contracts.
- Run `npm run smoke-onchain` after deployment to validate open/cast/replay-protection on-chain.
- Voting contract includes admin rotation, pause control, and time-window gating for production operations.
- Off-chain helper now uses Poseidon hashing; regenerate verifier artifacts when circuit hash logic changes.

## Notes

- Contract-level tests use `snforge` and now cover access control, vote lifecycle, pause/state checks, and nullifier replay protection.
