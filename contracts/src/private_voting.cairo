use starknet::ContractAddress;

#[starknet::interface]
pub trait IProofVerifier<TContractState> {
    fn verify_proof(
        self: @TContractState,
        proof: Array<felt252>,
        public_inputs: Array<felt252>,
    ) -> bool;
}

#[starknet::interface]
pub trait IVVCoin<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress) -> u128;
}

#[starknet::contract]
mod PrivateVoting {
    use starknet::ContractAddress;
    use starknet::get_block_timestamp;
    use starknet::get_caller_address;
    use starknet::storage::Map;

    use super::IProofVerifierDispatcher;
    use super::IProofVerifierDispatcherTrait;
    use super::IVVCoinDispatcher;
    use super::IVVCoinDispatcherTrait;

    #[storage]
    struct Storage {
        verifier: ContractAddress,
        admin: ContractAddress,
        vv_coin: ContractAddress,
        election_id: felt252,
        merkle_root: felt252,
        voting_open: bool,
        voting_paused: bool,
        voting_start_time: u64,
        voting_end_time: u64,
        used_nullifier: Map<felt252, bool>,
        vote_commitments: Map<u64, felt252>,
        vote_count: u64,
        proposal_count: u64,
        proposal_title: Map<u64, felt252>,
        proposal_deadline: Map<u64, u64>,
        proposal_open: Map<u64, bool>,
        proposal_for_votes: Map<u64, u128>,
        proposal_against_votes: Map<u64, u128>,
        proposal_has_voted: Map<(u64, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        VoteAccepted: VoteAccepted,
        RootUpdated: RootUpdated,
        VotingOpened: VotingOpened,
        VotingClosed: VotingClosed,
        VotingPaused: VotingPaused,
        AdminUpdated: AdminUpdated,
        ProposalCreated: ProposalCreated,
        ProposalVoted: ProposalVoted,
        ProposalClosed: ProposalClosed,
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
        start_time: u64,
        end_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct VotingClosed {}

    #[derive(Drop, starknet::Event)]
    struct VotingPaused {
        paused: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminUpdated {
        old_admin: ContractAddress,
        new_admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalCreated {
        proposal_id: u64,
        title: felt252,
        deadline: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalVoted {
        proposal_id: u64,
        voter: ContractAddress,
        support: bool,
        weight: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalClosed {
        proposal_id: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, verifier: ContractAddress, admin: ContractAddress, vv_coin: ContractAddress,
    ) {
        self.verifier.write(verifier);
        self.admin.write(admin);
        self.vv_coin.write(vv_coin);
        self.voting_open.write(false);
        self.voting_paused.write(false);
        self.voting_start_time.write(0);
        self.voting_end_time.write(0);
        self.vote_count.write(0);
        self.proposal_count.write(0);
    }

    fn assert_admin(self: @ContractState) {
        let caller = get_caller_address();
        let admin = self.admin.read();
        assert(caller == admin, 'NOT_ADMIN');
    }

    #[external(v0)]
    fn open_voting(
        ref self: ContractState,
        election_id: felt252,
        merkle_root: felt252,
        start_time: u64,
        end_time: u64,
    ) {
        assert_admin(@self);
        assert(start_time <= end_time, 'INVALID_WINDOW');

        self.election_id.write(election_id);
        self.merkle_root.write(merkle_root);
        self.voting_start_time.write(start_time);
        self.voting_end_time.write(end_time);
        self.voting_open.write(true);
        self.voting_paused.write(false);

        self.emit(VotingOpened { election_id, merkle_root, start_time, end_time });
    }

    #[external(v0)]
    fn close_voting(ref self: ContractState) {
        assert_admin(@self);
        self.voting_open.write(false);
        self.emit(VotingClosed {});
    }

    #[external(v0)]
    fn update_root(ref self: ContractState, merkle_root: felt252) {
        assert_admin(@self);
        self.merkle_root.write(merkle_root);
        self.emit(RootUpdated { new_root: merkle_root });
    }

    #[external(v0)]
    fn set_paused(ref self: ContractState, paused: bool) {
        assert_admin(@self);
        self.voting_paused.write(paused);
        self.emit(VotingPaused { paused });
    }

    #[external(v0)]
    fn rotate_admin(ref self: ContractState, new_admin: ContractAddress) {
        assert_admin(@self);
        let old_admin = self.admin.read();
        self.admin.write(new_admin);
        self.emit(AdminUpdated { old_admin, new_admin });
    }

    #[external(v0)]
    fn create_proposal(ref self: ContractState, title: felt252, deadline: u64) -> u64 {
        assert_admin(@self);
        let now = get_block_timestamp();
        assert(deadline > now, 'INVALID_DEADLINE');

        let proposal_id = self.proposal_count.read();
        self.proposal_count.write(proposal_id + 1);

        self.proposal_title.write(proposal_id, title);
        self.proposal_deadline.write(proposal_id, deadline);
        self.proposal_open.write(proposal_id, true);
        self.proposal_for_votes.write(proposal_id, 0);
        self.proposal_against_votes.write(proposal_id, 0);

        self.emit(ProposalCreated { proposal_id, title, deadline });
        proposal_id
    }

    #[external(v0)]
    fn close_proposal(ref self: ContractState, proposal_id: u64) {
        assert_admin(@self);
        assert(proposal_id < self.proposal_count.read(), 'INVALID_PROPOSAL');
        self.proposal_open.write(proposal_id, false);
        self.emit(ProposalClosed { proposal_id });
    }

    #[external(v0)]
    fn vote_on_proposal(ref self: ContractState, proposal_id: u64, support: bool) {
        assert(proposal_id < self.proposal_count.read(), 'INVALID_PROPOSAL');
        assert(self.proposal_open.read(proposal_id), 'PROPOSAL_CLOSED');
        let now = get_block_timestamp();
        assert(now <= self.proposal_deadline.read(proposal_id), 'PROPOSAL_ENDED');

        let voter = get_caller_address();
        assert(!self.proposal_has_voted.read((proposal_id, voter)), 'ALREADY_VOTED');

        let vv_dispatcher = IVVCoinDispatcher { contract_address: self.vv_coin.read() };
        let weight = vv_dispatcher.balance_of(voter);
        assert(weight > 0, 'NO_VOTING_POWER');

        if support {
            let current_for = self.proposal_for_votes.read(proposal_id);
            self.proposal_for_votes.write(proposal_id, current_for + weight);
        } else {
            let current_against = self.proposal_against_votes.read(proposal_id);
            self.proposal_against_votes.write(proposal_id, current_against + weight);
        }

        self.proposal_has_voted.write((proposal_id, voter), true);
        self.emit(ProposalVoted { proposal_id, voter, support, weight });
    }

    #[external(v0)]
    fn cast_vote(
        ref self: ContractState,
        nullifier_hash: felt252,
        vote_commitment: felt252,
        proof: Array<felt252>,
    ) {
        assert(nullifier_hash != 0, 'INVALID_NULLIFIER');
        assert(proof.len() > 0, 'MISSING_PROOF');
        assert(self.voting_open.read(), 'VOTING_CLOSED');
        assert(!self.voting_paused.read(), 'VOTING_PAUSED');
        let now = get_block_timestamp();
        assert(now >= self.voting_start_time.read(), 'VOTING_NOT_STARTED');
        assert(now <= self.voting_end_time.read(), 'VOTING_ENDED');
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

        self.emit(VoteAccepted { nullifier_hash, vote_commitment, index: idx });
    }

    #[external(v0)]
    fn has_voted(self: @ContractState, nullifier_hash: felt252) -> bool {
        self.used_nullifier.read(nullifier_hash)
    }

    #[external(v0)]
    fn get_vote_count(self: @ContractState) -> u64 {
        self.vote_count.read()
    }

    #[external(v0)]
    fn get_vote_commitment(self: @ContractState, idx: u64) -> felt252 {
        self.vote_commitments.read(idx)
    }

    #[external(v0)]
    fn get_election_config(self: @ContractState) -> (felt252, felt252, bool) {
        (self.election_id.read(), self.merkle_root.read(), self.voting_open.read())
    }

    #[external(v0)]
    fn get_voting_window(self: @ContractState) -> (u64, u64) {
        (self.voting_start_time.read(), self.voting_end_time.read())
    }

    #[external(v0)]
    fn is_paused(self: @ContractState) -> bool {
        self.voting_paused.read()
    }

    #[external(v0)]
    fn get_admin(self: @ContractState) -> ContractAddress {
        self.admin.read()
    }

    #[external(v0)]
    fn get_token_address(self: @ContractState) -> ContractAddress {
        self.vv_coin.read()
    }

    #[external(v0)]
    fn get_proposal_count(self: @ContractState) -> u64 {
        self.proposal_count.read()
    }

    #[external(v0)]
    fn get_proposal(self: @ContractState, proposal_id: u64) -> (felt252, u64, bool, u128, u128) {
        (
            self.proposal_title.read(proposal_id),
            self.proposal_deadline.read(proposal_id),
            self.proposal_open.read(proposal_id),
            self.proposal_for_votes.read(proposal_id),
            self.proposal_against_votes.read(proposal_id),
        )
    }

    #[external(v0)]
    fn has_voted_proposal(self: @ContractState, proposal_id: u64, voter: ContractAddress) -> bool {
        self.proposal_has_voted.read((proposal_id, voter))
    }
}
