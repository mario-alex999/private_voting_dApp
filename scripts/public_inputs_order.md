# Public Inputs Order Contract/Circuit Compatibility

Ensure this exact order when sending `public_inputs` to the verifier:

1. `election_id`
2. `merkle_root`
3. `nullifier_hash`
4. `vote_commitment`

If this order differs from the order expected by the generated verifier, proof verification will fail.
