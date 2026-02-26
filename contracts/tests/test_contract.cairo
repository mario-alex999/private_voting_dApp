use core::traits::TryInto;
use snforge_std::{
    ContractClassTrait,
    DeclareResult,
    declare,
    start_cheat_block_timestamp_global,
    start_cheat_caller_address,
    test_address,
};
use starknet::ContractAddress;

#[starknet::interface]
trait IPrivateVoting<TContractState> {
    fn open_voting(
        ref self: TContractState, election_id: felt252, merkle_root: felt252, start_time: u64, end_time: u64,
    );
    fn close_voting(ref self: TContractState);
    fn update_root(ref self: TContractState, merkle_root: felt252);
    fn set_paused(ref self: TContractState, paused: bool);
    fn rotate_admin(ref self: TContractState, new_admin: ContractAddress);
    fn cast_vote(
        ref self: TContractState,
        nullifier_hash: felt252,
        vote_commitment: felt252,
        proof: Array<felt252>,
    );
    fn has_voted(self: @TContractState, nullifier_hash: felt252) -> bool;
    fn get_vote_count(self: @TContractState) -> u64;
    fn get_vote_commitment(self: @TContractState, idx: u64) -> felt252;
    fn get_election_config(self: @TContractState) -> (felt252, felt252, bool);
    fn get_voting_window(self: @TContractState) -> (u64, u64);
    fn is_paused(self: @TContractState) -> bool;
    fn get_admin(self: @TContractState) -> ContractAddress;

    fn create_proposal(ref self: TContractState, title: felt252, deadline: u64) -> u64;
    fn close_proposal(ref self: TContractState, proposal_id: u64);
    fn vote_on_proposal(
        ref self: TContractState,
        proposal_id: u64,
        support: bool,
        weight: u128,
        nullifier_hash: felt252,
        proof: Array<felt252>,
    );
    fn get_token_address(self: @TContractState) -> ContractAddress;
    fn get_proposal_count(self: @TContractState) -> u64;
    fn get_proposal(self: @TContractState, proposal_id: u64) -> (felt252, u64, bool, u128, u128);
    fn has_voted_proposal(self: @TContractState, proposal_id: u64, nullifier_hash: felt252) -> bool;
}

#[starknet::interface]
trait IMockVerifier<TContractState> {
    fn set_result(ref self: TContractState, next: bool);
}

fn deploy_mock_verifier(initial_result: bool) -> ContractAddress {
    let class = match declare("MockVerifier").unwrap() {
        DeclareResult::Success(class) => class,
        DeclareResult::AlreadyDeclared(class) => class,
    };
    let calldata = array![initial_result.into()];
    let (address, _) = class.deploy(@calldata).unwrap();
    address
}

fn deploy_vv_coin(admin: ContractAddress, initial_holder: ContractAddress, initial_supply: u128) -> ContractAddress {
    let class = match declare("VVCoin").unwrap() {
        DeclareResult::Success(class) => class,
        DeclareResult::AlreadyDeclared(class) => class,
    };
    let calldata = array![admin.into(), initial_holder.into(), initial_supply.into()];
    let (address, _) = class.deploy(@calldata).unwrap();
    address
}

fn deploy_private_voting(
    verifier: ContractAddress, admin: ContractAddress, token: ContractAddress,
) -> IPrivateVotingDispatcher {
    let class = match declare("PrivateVoting").unwrap() {
        DeclareResult::Success(class) => class,
        DeclareResult::AlreadyDeclared(class) => class,
    };
    let calldata = array![verifier.into(), admin.into(), token.into()];
    let (address, _) = class.deploy(@calldata).unwrap();
    IPrivateVotingDispatcher { contract_address: address }
}

#[test]
fn test_open_voting_sets_config() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(202501, 999, 10, 20);
    let (election_id, merkle_root, open) = voting.get_election_config();
    let (start_time, end_time) = voting.get_voting_window();

    assert(election_id == 202501, 'BAD_ELECTION_ID');
    assert(merkle_root == 999, 'BAD_ROOT');
    assert(open, 'SHOULD_BE_OPEN');
    assert(start_time == 10, 'BAD_START');
    assert(end_time == 20, 'BAD_END');
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_open_voting_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let other: ContractAddress = 0x123.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.open_voting(9, 9, 0, 1000);
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_close_voting_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let other: ContractAddress = 0x124.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.close_voting();
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_update_root_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let other: ContractAddress = 0x125.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.update_root(777);
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_set_paused_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let other: ContractAddress = 0x126.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.set_paused(true);
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_rotate_admin_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let other: ContractAddress = 0x127.try_into().unwrap();
    let new_admin: ContractAddress = 0x128.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.rotate_admin(new_admin);
}

#[test]
fn test_cast_vote_success_updates_state() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(77, 1234, 0, 18446744073709551615_u64);

    let proof = array![11, 22, 33];
    voting.cast_vote(555, 888, proof);

    assert(voting.has_voted(555), 'NULLIFIER_NOT_MARKED');
    assert(voting.get_vote_count() == 1, 'COUNT_NOT_INCREMENTED');
    assert(voting.get_vote_commitment(0) == 888, 'COMMITMENT_NOT_STORED');
}

#[test]
fn test_rotate_admin_updates_value() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);
    let new_admin: ContractAddress = 0x999.try_into().unwrap();

    voting.rotate_admin(new_admin);
    assert(voting.get_admin() == new_admin, 'ADMIN_NOT_UPDATED');
}

#[test]
#[should_panic(expected: ('VOTING_PAUSED',))]
fn test_cast_vote_reverts_when_paused() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(9, 9, 0, 18446744073709551615_u64);
    voting.set_paused(true);
    voting.cast_vote(7, 8, array![1]);
}

#[test]
#[should_panic(expected: ('VOTING_NOT_STARTED',))]
fn test_cast_vote_reverts_before_start_time() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    start_cheat_block_timestamp_global(5);
    voting.open_voting(9, 9, 10, 20);
    voting.cast_vote(7, 8, array![1]);
}

#[test]
#[should_panic(expected: ('VOTING_ENDED',))]
fn test_cast_vote_reverts_after_end_time() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    start_cheat_block_timestamp_global(50);
    voting.open_voting(9, 9, 10, 20);
    voting.cast_vote(7, 8, array![1]);
}

#[test]
#[should_panic(expected: ('VOTING_CLOSED',))]
fn test_cast_vote_reverts_when_closed() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    let proof = array![1];
    voting.cast_vote(1, 2, proof);
}

#[test]
#[should_panic(expected: ('MISSING_PROOF',))]
fn test_cast_vote_reverts_without_proof() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(1, 2, 0, 18446744073709551615_u64);
    voting.cast_vote(10, 20, array![]);
}

#[test]
#[should_panic(expected: ('INVALID_NULLIFIER',))]
fn test_cast_vote_reverts_with_zero_nullifier() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(1, 2, 0, 18446744073709551615_u64);
    voting.cast_vote(0, 20, array![1]);
}

#[test]
#[should_panic(expected: ('INVALID_PROOF',))]
fn test_cast_vote_reverts_on_invalid_proof() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(false);
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier, admin, token);

    voting.open_voting(1, 2, 0, 18446744073709551615_u64);
    let proof = array![1, 2];
    voting.cast_vote(10, 20, proof);
}

#[test]
#[should_panic(expected: ('NULLIFIER_USED',))]
fn test_cast_vote_reverts_on_nullifier_reuse() {
    let admin = test_address();
    let verifier_address = deploy_mock_verifier(true);
    let verifier = IMockVerifierDispatcher { contract_address: verifier_address };
    let token = deploy_vv_coin(admin, admin, 1);
    let voting = deploy_private_voting(verifier_address, admin, token);

    voting.open_voting(300, 400, 0, 18446744073709551615_u64);

    let proof1 = array![3];
    voting.cast_vote(999, 111, proof1);
    verifier.set_result(true);

    let proof2 = array![4];
    voting.cast_vote(999, 222, proof2);
}

#[test]
fn test_weighted_proposal_vote_counts_by_balance() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('UPGRADE', 200);

    voting.vote_on_proposal(proposal_id, true, 100, 1001, array![1, 2, 3]);
    voting.vote_on_proposal(proposal_id, false, 300, 1002, array![4, 5, 6]);

    let (_, _, _, for_votes, against_votes) = voting.get_proposal(proposal_id);
    assert(for_votes == 100, 'BAD_FOR_WEIGHT');
    assert(against_votes == 300, 'BAD_AGAINST_WEIGHT');
    assert(voting.has_voted_proposal(proposal_id, 1001), 'MISSING_NULLIFIER_A');
    assert(voting.has_voted_proposal(proposal_id, 1002), 'MISSING_NULLIFIER_B');
}

#[test]
#[should_panic(expected: ('INVALID_WEIGHT',))]
fn test_vote_on_proposal_reverts_with_zero_weight() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('CHANGE_1', 200);
    voting.vote_on_proposal(proposal_id, true, 0, 2024, array![7]);
}

#[test]
#[should_panic(expected: ('NULLIFIER_USED',))]
fn test_vote_on_proposal_reverts_on_nullifier_reuse() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('CHANGE_2', 300);
    voting.vote_on_proposal(proposal_id, true, 50, 5555, array![8]);
    voting.vote_on_proposal(proposal_id, false, 75, 5555, array![9]);
}

#[test]
#[should_panic(expected: ('MISSING_PROOF',))]
fn test_vote_on_proposal_reverts_without_proof() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('CHANGE_3', 300);
    voting.vote_on_proposal(proposal_id, true, 25, 7001, array![]);
}

#[test]
#[should_panic(expected: ('INVALID_PROOF',))]
fn test_vote_on_proposal_reverts_on_invalid_proof() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(false);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('CHANGE_4', 300);
    voting.vote_on_proposal(proposal_id, true, 25, 7002, array![12, 13]);
}

#[test]
#[should_panic(expected: ('NOT_ADMIN',))]
fn test_create_proposal_reverts_for_non_admin() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);
    let other: ContractAddress = 0x444.try_into().unwrap();

    start_cheat_caller_address(voting.contract_address, other);
    voting.create_proposal('NOT_ALLOWED', 999);
}

#[test]
#[should_panic(expected: ('PROPOSAL_ENDED',))]
fn test_vote_on_proposal_reverts_after_deadline() {
    let admin = test_address();
    let verifier = deploy_mock_verifier(true);
    let token_address = deploy_vv_coin(admin, admin, 0);
    let voting = deploy_private_voting(verifier, admin, token_address);

    start_cheat_block_timestamp_global(100);
    let proposal_id = voting.create_proposal('EXPIRED', 101);
    start_cheat_block_timestamp_global(200);
    voting.vote_on_proposal(proposal_id, true, 10, 9998, array![11]);
}
