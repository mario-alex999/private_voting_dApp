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
- Voting weight is `VV Coin` balance (`balance_of(voter)`).
- One address can vote once per proposal (`ALREADY_VOTED`).
- Zero token balance cannot vote (`NO_VOTING_POWER`).
- Proposal deadline and open-state are enforced.

### 3) Wallet UX/security updates
- Wallet connect requires Starknet-compatible addresses.
- Frontend blocks voting actions when wallet is not connected.
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
- `scripts/onchain/deployVoteVault.js`: declares/deploys contracts and writes addresses
- `scripts/onchain/smokeTest.js`: optional on-chain smoke flow
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
- Contract integration tests: `21/21` passing (`snforge test`)
- Frontend production build: passing (`next build`)
