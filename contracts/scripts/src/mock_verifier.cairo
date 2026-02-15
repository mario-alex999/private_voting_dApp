#[starknet::contract]
pub mod MockVerifier {
    #[storage]
    struct Storage {
        result: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_result: bool) {
        self.result.write(initial_result);
    }

    #[external(v0)]
    fn set_result(ref self: ContractState, next: bool) {
        self.result.write(next);
    }

    #[view]
    fn verify_proof(
        self: @ContractState,
        _proof: Array<felt252>,
        _public_inputs: Array<felt252>,
    ) -> bool {
        self.result.read()
    }
}
