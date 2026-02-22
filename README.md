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

