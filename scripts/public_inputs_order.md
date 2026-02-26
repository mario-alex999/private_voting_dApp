# Public Inputs Order Contract/Circuit Compatibility

## Private ballot (`cast_vote`)

Use this exact order for `circuits/private_vote.nr`:

1. `election_id`
2. `merkle_root`
3. `nullifier_hash`
4. `vote_commitment`

## Private token-weighted DAO vote (`vote_on_proposal`)

Use this exact order for `circuits/private_token_weighted_vote.nr`:

1. `election_id`
2. `merkle_root`
3. `proposal_id`
4. `support`
5. `weight`
6. `nullifier_hash`

If the order differs from the verifier expectation, proof verification fails on-chain.
