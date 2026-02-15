#[starknet::interface]
pub trait IProofVerifier<TContractState> {
    fn verify_proof(
        self: @TContractState,
        proof: Array<felt252>,
        public_inputs: Array<felt252>,
    ) -> bool;
}

#[starknet::contract]
mod PrivateVoting {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use super::IProofVerifierDispatcher;

    #[storage]
    struct Storage {
        verifier: ContractAddress,
        admin: ContractAddress,
        election_id: felt252,
        merkle_root: felt252,
        voting_open: bool,
        used_nullifier: LegacyMap<felt252, bool>,
        vote_commitments: LegacyMap<u64, felt252>,
        vote_count: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        VoteAccepted: VoteAccepted,
        RootUpdated: RootUpdated,
        VotingOpened: VotingOpened,
        VotingClosed: VotingClosed,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteAccepted {
        nullifier_hash: felt252,
        vote_commitment: felt252,
        index: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct RootUpdated {
        new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct VotingOpened {
        election_id: felt252,
        merkle_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct VotingClosed {}

    #[constructor]
    fn constructor(
        ref self: ContractState,
        verifier: ContractAddress,
        admin: ContractAddress,
    ) {
        self.verifier.write(verifier);
        self.admin.write(admin);
        self.voting_open.write(false);
        self.vote_count.write(0);
    }

    fn assert_admin(self: @ContractState) {
        assert(get_caller_address() == self.admin.read(), 'ONLY_ADMIN');
    }

    #[external(v0)]
    fn open_voting(ref self: ContractState, election_id: felt252, merkle_root: felt252) {
        self.assert_admin();
        self.election_id.write(election_id);
        self.merkle_root.write(merkle_root);
        self.voting_open.write(true);
        self.emit(VotingOpened { election_id, merkle_root });
    }

    #[external(v0)]
    fn close_voting(ref self: ContractState) {
        self.assert_admin();
        self.voting_open.write(false);
        self.emit(VotingClosed {});
    }

    #[external(v0)]
    fn update_root(ref self: ContractState, merkle_root: felt252) {
        self.assert_admin();
        self.merkle_root.write(merkle_root);
        self.emit(RootUpdated { new_root: merkle_root });
    }

    #[external(v0)]
    fn cast_vote(
        ref self: ContractState,
        nullifier_hash: felt252,
        vote_commitment: felt252,
        proof: Array<felt252>,
    ) {
        assert(self.voting_open.read(), 'VOTING_CLOSED');
        assert(!self.used_nullifier.read(nullifier_hash), 'NULLIFIER_USED');

        let election_id = self.election_id.read();
        let merkle_root = self.merkle_root.read();

        let mut public_inputs = array![];
        public_inputs.append(election_id);
        public_inputs.append(merkle_root);
        public_inputs.append(nullifier_hash);
        public_inputs.append(vote_commitment);

        let verifier_dispatcher = IProofVerifierDispatcher {
            contract_address: self.verifier.read(),
        };

        let ok = verifier_dispatcher.verify_proof(proof, public_inputs);
        assert(ok, 'INVALID_PROOF');

        self.used_nullifier.write(nullifier_hash, true);

        let idx = self.vote_count.read();
        self.vote_commitments.write(idx, vote_commitment);
        self.vote_count.write(idx + 1);

        self.emit(VoteAccepted {
            nullifier_hash,
            vote_commitment,
            index: idx,
        });
    }

    #[view]
    fn has_voted(self: @ContractState, nullifier_hash: felt252) -> bool {
        self.used_nullifier.read(nullifier_hash)
    }

    #[view]
    fn get_vote_count(self: @ContractState) -> u64 {
        self.vote_count.read()
    }

    #[view]
    fn get_vote_commitment(self: @ContractState, idx: u64) -> felt252 {
        self.vote_commitments.read(idx)
    }
}
