#[starknet::contract]
mod VVCoin {
    use starknet::storage::Map;
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        admin: ContractAddress,
        balances: Map<ContractAddress, u128>,
        total_supply: u128,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Mint: Mint,
        AdminUpdated: AdminUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct Mint {
        to: ContractAddress,
        amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminUpdated {
        old_admin: ContractAddress,
        new_admin: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        initial_holder: ContractAddress,
        initial_supply: u128,
    ) {
        self.admin.write(admin);
        self.total_supply.write(initial_supply);
        if initial_supply > 0 {
            self.balances.write(initial_holder, initial_supply);
            self.emit(Mint { to: initial_holder, amount: initial_supply });
        }
    }

    fn assert_admin(self: @ContractState) {
        let caller = get_caller_address();
        assert(caller == self.admin.read(), 'NOT_ADMIN');
    }

    #[external(v0)]
    fn mint(ref self: ContractState, to: ContractAddress, amount: u128) {
        assert_admin(@self);
        let current = self.balances.read(to);
        self.balances.write(to, current + amount);
        self.total_supply.write(self.total_supply.read() + amount);
        self.emit(Mint { to, amount });
    }

    #[external(v0)]
    fn transfer(ref self: ContractState, to: ContractAddress, amount: u128) {
        let from = get_caller_address();
        let from_balance = self.balances.read(from);
        assert(from_balance >= amount, 'INSUFFICIENT_BALANCE');

        self.balances.write(from, from_balance - amount);
        let to_balance = self.balances.read(to);
        self.balances.write(to, to_balance + amount);

        self.emit(Transfer { from, to, amount });
    }

    #[external(v0)]
    fn balance_of(self: @ContractState, account: ContractAddress) -> u128 {
        self.balances.read(account)
    }

    #[external(v0)]
    fn get_total_supply(self: @ContractState) -> u128 {
        self.total_supply.read()
    }

    #[external(v0)]
    fn get_admin(self: @ContractState) -> ContractAddress {
        self.admin.read()
    }

    #[external(v0)]
    fn rotate_admin(ref self: ContractState, new_admin: ContractAddress) {
        assert_admin(@self);
        let old_admin = self.admin.read();
        self.admin.write(new_admin);
        self.emit(AdminUpdated { old_admin, new_admin });
    }
}
