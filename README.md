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
- Invalid proof / missing proof / invalid weight are rejected:
  - `INVALID_PROOF`
  - `MISSING_PROOF`
  - `INVALID_WEIGHT`
- Proposal deadline and open-state are enforced.

### 3) Wallet UX/security updates
- Wallet connect requires Starknet-compatible addresses.
- Frontend blocks voting actions when wallet is not connected.
- Wallet session persists across refresh (does not auto-disconnect or fall back to landing page).
- Argent X and Braavos logos now use official wallet images stored locally:
  - `frontend/public/wallets/argent-x.svg`
  - `frontend/public/wallets/braavos.svg`

## Contracts
- `contracts/src/private_voting.cairo`: private voting + DAO proposal voting
- `contracts/src/vv_coin.cairo`: `VV Coin` (mint/transfer/balance/admin)
- `contracts/src/mock_verifier.cairo`: test verifier
- `contracts/tests/test_contract.cairo`: integration coverage (21 tests)

## Repository layout
- `circuits/private_vote.nr`: Noir circuit source
- `circuits/private_token_weighted_vote.nr`: Noir circuit for private token-weighted DAO vote proofs
- `scripts/onchain/deployVoteVault.js`: declares/deploys contracts and writes addresses
- `scripts/onchain/smokeTest.js`: optional on-chain smoke flow
- `scripts/public_inputs_order.md`: required verifier public-input ordering
- `frontend/src/app/page.tsx`: main dApp UI and Starknet interactions
- `frontend/public/address-book.json`: deployed address map for UI

## Local setup
1. Install dependencies:
```bash
npm install
```
2. Configure env from `.env.example`:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```
3. Build and test contracts:
```bash
npm run build-contracts
npm run test-contracts
```
4. Build frontend:
```bash
cd frontend && npm run build
```

## Deploy to Starknet Sepolia
1. Ensure `.env` has:
- `RPC_URL_SEPOLIA`
- `PRIVATE_KEY_SEPOLIA`
- `ACCOUNT_ADDRESS_SEPOLIA`
2. Deploy all contracts:
```bash
npm run deploy-votevault
```
3. Sync frontend/public addresses (if needed):
```bash
node scripts/syncAddresses.js
```

`deployVoteVault.js` writes deployed contract addresses/class hashes into `.env` and frontend configs, including:
- `CONTRACTS_PRIVATE_VOTING_ADDRESS`
- `CONTRACTS_MOCK_VERIFIER_ADDRESS`
- `CONTRACTS_VV_COIN_ADDRESS`
- `NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS`
- `NEXT_PUBLIC_MOCK_VERIFIER_ADDRESS`
- `NEXT_PUBLIC_VV_COIN_ADDRESS`

## Current verification status
- Contract integration tests: `23/23` passing (`snforge test`)
- Frontend production build: passing (`next build`)
