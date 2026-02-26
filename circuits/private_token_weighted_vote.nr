use dep::std::hash::pedersen_hash;

fn hash2(a: Field, b: Field) -> Field {
    pedersen_hash([a, b])
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
    // Public inputs (must match Starknet verifier input order)
    pub election_id: Field,
    pub merkle_root: Field,
    pub proposal_id: Field,
    pub support: Field,
    pub weight: Field,
    pub nullifier_hash: Field,

    // Private witness
    identity_secret: Field,
    token_balance: Field,
    voter_leaf: Field,
    path: [Field; 20],
    index_bits: [Field; 20],
) {
    // support in {0, 1}
    assert(support * (support - 1) == 0);

    // membership: voter leaf is in eligibility/snapshot tree
    assert(verify_merkle_path(voter_leaf, merkle_root, path, index_bits));

    // leaf binds identity + balance + election domain
    assert(voter_leaf == hash3(identity_secret, token_balance, election_id));

    // enforce token-weighted voting
    assert(weight == token_balance);

    // per-proposal nullifier for one-person-one-vote
    let computed_nullifier = hash3(identity_secret, election_id, proposal_id);
    assert(computed_nullifier == nullifier_hash);
}
