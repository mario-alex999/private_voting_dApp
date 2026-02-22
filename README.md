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

## Notes

- Contract-level tests using `snforge` are prepared by project scripts, but require Starknet Foundry installed in your environment.
- The off-chain helper currently mirrors the circuit's demonstration hash (`a + b` over a field). For production, replace this with a collision-resistant hash in both Noir and off-chain code (e.g., Poseidon/Pedersen) and regenerate verifier artifacts.
