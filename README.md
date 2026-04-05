# VoteVault

VoteVault is a Starknet voting dApp that combines:
- private nullifier-proof voting, and
- token-weighted DAO governance with a native token (`VV Coin`).

## Core capabilities

### 1) Private voting (`cast_vote`)
- Rejects votes without proof: `MISSING_PROOF`
- Rejects invalid proofs: `INVALID_PROOF`
- Rejects invalid nullifier: `INVALID_NULLIFIER`
- Rejects duplicate nullifier reuse: `NULLIFIER_USED`
- Enforces voting lifecycle and safety checks:
  - `VOTING_CLOSED`
  - `VOTING_PAUSED`
  - `VOTING_NOT_STARTED`
  - `VOTING_ENDED`

### 2) DAO governance (token-weighted)
- Proposals are created on-chain by admin.
- DAO vote submission is proof-based: `vote_on_proposal(proposal_id, support, weight, nullifier_hash, proof)`.
- Token weight is verified through ZK public inputs (`weight`) against the eligibility/snapshot Merkle root.
- Duplicate nullifier per proposal is rejected: `NULLIFIER_USED`.
- Proposal vote replay check uses nullifier lookup: `has_voted_proposal(proposal_id, nullifier_hash)`.
- Invalid proof / missing proof / invalid weight are rejected:
  - `INVALID_PROOF`
  - `MISSING_PROOF`
  - `INVALID_WEIGHT`
- Proposal deadline and open-state are enforced.

3) Wallet UX/security 
- Wallet connect requires Starknet-compatible addresses.
- Frontend blocks voting actions when wallet is not connected.
  

## Contracts
- `contracts/src/private_voting.cairo`: private voting + DAO proposal voting
- `contracts/src/vv_coin.cairo`: `VV Coin` (mint/transfer/balance/admin)
- `contracts/src/mock_verifier.cairo`: test verifier
- `contracts/tests/test_contract.cairo`: integration coverage (23 tests)

## Repository layout
- `circuits/private_vote.nr`: Noir circuit source
- `circuits/private_token_weighted_vote.nr`: Noir circuit for private token-weighted DAO vote proofs
- `scripts/onchain/deployVoteVault.js`: declares/deploys contracts and writes addresses
- `scripts/onchain/smokeTest.js`: optional on-chain smoke flow
- `scripts/public_inputs_order.md`: required verifier public-input ordering
- `frontend/src/app/page.tsx`: main dApp UI and Starknet interactions
- `frontend/public/address-book.json`: deployed address map for UI


## Recent changes
- Added private token-weighted DAO vote path with proof verification in `vote_on_proposal`.
- Added Noir circuit for private weighted proposal votes: `circuits/private_token_weighted_vote.nr`.
- Added offchain helpers for weighted-proof inputs in `scripts/offchain/privateVoting.js`.
- Added wallet session persistence across page refresh in `frontend/src/app/page.tsx`.

## Production launch guide
- Full production hardening runbook: `docs/production-launch-playbook.md`
