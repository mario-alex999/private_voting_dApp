# Private Voting System (Starknet + Noir + Garaga)

Plug-and-play private voting backend for DAOs, schools, and communities.

## What this provides
- **Private identity**: voter identity secret stays off-chain.
- **One person = one vote**: enforced with nullifier replay protection on-chain.
- **Verified correctness**: proof verifier checks circuit constraints before accepting votes.
- **Starknet-ready flow**: verifier contract + voting state contract.

## Important implementation note
The ZK circuit is written in **Noir (not Cairo)**.

- **Noir**: proving logic (membership, nullifier, vote constraints).
- **Cairo/Starknet**: verifier contract integration and vote state handling.

## Repository layout
- `circuits/private_vote.nr`: Noir voting circuit.
- `contracts/src/private_voting.cairo`: Starknet voting contract that consumes verifier results.
- `docs/research-and-plan.md`: architecture notes and backend implementation guidance.

## High-level workflow
1. Build Merkle tree of eligible voter commitments.
2. User generates proof from Noir circuit with private witness.
3. Garaga-generated verifier contract validates proof on Starknet.
4. Voting contract:
   - rejects used `nullifier_hash`,
   - accepts valid proof,
   - stores `vote_commitment`.

## Garaga verifier generation (conceptual)
Use Garaga docs/tooling for your exact command versions.

Typical flow:
1. Compile Noir circuit and generate proving artifacts.
2. Export verification key in Garaga-compatible format.
3. Generate Starknet verifier contract with Garaga.
4. Deploy verifier contract.
5. Deploy `PrivateVoting` with verifier address.

## Security checklist
- Pin versions for Noir/prover/Garaga/Cairo.
- Domain-separate hashes with `election_id`.
- Add election timing controls and admin governance.
- Audit hash functions and proof serialization.

