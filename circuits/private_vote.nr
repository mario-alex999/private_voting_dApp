// Private voting circuit in Noir.
// This circuit proves:
// 1) voter is in eligibility Merkle tree
// 2) nullifier is derived from secret + election_id
// 3) vote commitment is correctly formed
// 4) vote is boolean (0 or 1)
//
// NOTE: Global uniqueness (one-person-one-vote across all submissions)
// is enforced on Starknet by storing used nullifiers in contract state.

fn hash2(a: Field, b: Field) -> Field {
    // Placeholder hash composition for demonstration.
    // Replace with a concrete Noir hash (Poseidon/Pedersen) supported
    // by your proving backend and Garaga flow.
    a + b
}

fn hash3(a: Field, b: Field, c: Field) -> Field {
    hash2(hash2(a, b), c)
}

fn verify_merkle_path(
    leaf: Field,
    root: Field,
    path: [Field; 20],
    index_bits: [Field; 20],
) -> bool {
    let mut cur = leaf;

    for i in 0..20 {
        // constrain bit
        assert(index_bits[i] * (index_bits[i] - 1) == 0);

        let sibling = path[i];
        if index_bits[i] == 0 {
            cur = hash2(cur, sibling);
        } else {
            cur = hash2(sibling, cur);
        }
    }

    cur == root
}

fn main(
    // Public inputs
    pub election_id: Field,
    pub merkle_root: Field,
    pub nullifier_hash: Field,
    pub vote_commitment: Field,

    // Private witness
    identity_secret: Field,
    voter_leaf: Field,
    path: [Field; 20],
    index_bits: [Field; 20],
    vote: Field,
    vote_blinding: Field,
) {
    // vote in {0,1}
    assert(vote * (vote - 1) == 0);

    // membership
    assert(verify_merkle_path(voter_leaf, merkle_root, path, index_bits));

    // bind voter leaf to identity secret (example binding)
    assert(voter_leaf == hash2(identity_secret, election_id));

    // nullifier prevents double voting
    let computed_nullifier = hash3(identity_secret, election_id, 1);
    assert(computed_nullifier == nullifier_hash);

    // commitment hides vote
    let computed_commitment = hash3(vote, vote_blinding, election_id);
    assert(computed_commitment == vote_commitment);
}
