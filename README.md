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
- **Backend API** in `backend/` (integrated from the provided `Private voting backend.zip`) for:
  - voter register/login with JWT,
  - protected profile fetch,
  - one-time backend vote-state recording (`voted=true`) linked to tx hash.
- **Frontend flow** in `frontend/src/app/page.tsx` for:
  - backend authentication,
  - wallet connect,
  - Starknet vote submission (`cast_vote`),
  - backend vote-state update after successful on-chain tx.

