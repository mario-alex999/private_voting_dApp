# VoteVault Production Launch Playbook

This runbook covers installable frontend delivery, Starknet upgradeability, CI/CD, and production hardening for VoteVault.

## 1) Installable dApp (PWA)

### What is implemented
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/public/offline.html`
- `frontend/src/app/components/internal/PwaBootstrap.tsx`
- `frontend/src/app/layout.tsx` metadata updates

### Behavior
- Users can install VoteVault from browser (mobile + desktop prompt support).
- Service worker caches core static assets and provides an offline fallback page.
- Navigation requests use network-first with cached fallback for resilience.

### Verify locally
```bash
cd frontend
npm run build
npm run start
```
Then in browser DevTools:
1. Open **Application > Manifest** and confirm installability.
2. Open **Application > Service Workers** and confirm `/sw.js` is active.
3. Toggle offline mode and confirm `/offline.html` appears when network is unavailable.

### Native desktop wrappers (optional)

#### Tauri (recommended for lightweight client)
```bash
cd frontend
npm run build
cd ..
npm create tauri-app@latest votevault-desktop
# Point Tauri to VoteVault static export / hosted URL depending on your packaging mode.
```
Use Tauri if you want low memory overhead and Rust-level security controls.

#### Electron (if you need rich Node desktop integrations)
```bash
cd frontend
npm run build
# Create Electron shell that loads the production URL or bundled frontend build output.
```
Use Electron when you need broad plugin ecosystem or deep Node API usage.

## 2) Upgradeable smart-contract architecture (Starknet)

### Implemented pattern
For Starknet, the canonical state-preserving upgrade mechanism is **class replacement on the same contract address** (proxy-equivalent behavior, no state migration).

Implemented in `contracts/src/private_voting.cairo`:
- `upgrade(new_class_hash)` (admin-gated, uses `replace_class_syscall`)
- `set_verifier(new_verifier)` (admin-gated verifier rotation)
- `get_verifier()` for ops visibility

This gives you:
- Stable user-facing contract address
- In-place logic upgrades
- Ability to rotate verifier contract as Noir/Garaga circuits evolve

### Upgrade runbook
1. Build new contract class:
```bash
npm run build-contracts
```
2. Declare updated class on Starknet and capture the new class hash.
3. Execute upgrade:
```bash
npm run upgrade-private-voting --class_hash=0xNEW_CLASS_HASH
```
4. (Optional) rotate verifier in the same tx:
```bash
node scripts/onchain/upgradePrivateVoting.js --class-hash 0xNEW_CLASS_HASH --verifier 0xNEW_VERIFIER
```
5. Run smoke tests against production RPC.

### Storage-layout rules
- Never reorder or delete existing storage fields.
- Only append new storage fields to avoid layout collisions.
- Keep admin/upgrade auth strict (recommend multisig ownership for mainnet).

## 3) CI/CD release pipeline

Implemented workflow:
- `.github/workflows/vercel-production.yml`

Pipeline behavior:
- PR and push to `main`:
  - Cairo contract tests (`snforge`)
  - Noir circuit compilation checks (`nargo check` via CI helper)
  - Frontend build (`next build`)
- Push to `main` only:
  - Production Vercel deploy

Noir CI helper:
- `scripts/ci/check_noir_circuits.sh`

Required GitHub secret:
- `VERCEL_TOKEN`

## 4) Production optimization checklist

### Environment variables and secrets
- Keep **private keys and backend secrets** in runtime secret stores only (never `NEXT_PUBLIC_*`).
- Use `.env.production` (backend/off-chain ops) and `frontend/.env.production` (public-only config).
- Rotate keys quarterly or on any incident.

### Starknet RPC strategy
- Use at least two production RPC providers (primary + failover).
- Track provider latency and error rates in monitoring.
- Set conservative request timeouts and retry policy on read paths.

### API key security
- Scope keys by environment (`staging`, `prod`).
- Enforce origin restrictions where provider supports it.
- Alert on abnormal call volume spikes.

### Garaga verifier optimization (mainnet)
- Keep verifier contract decoupled and rotatable via `set_verifier`.
- Lock public-input ordering and hashing conventions in regression tests.
- Cache proof artifacts and use batched verification scheduling where applicable.
- Benchmark calldata/proof size impact before each circuit release.

### Release safety gates
- Canary on Sepolia before mainnet upgrade.
- Keep rollback class hash documented for immediate recovery.
- Post-deploy smoke checks:
  - wallet connect
  - proposal creation
  - proof submit path
  - verifier response

