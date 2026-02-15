export const PRIVATE_VOTING_ABI = [
  {
    type: 'function',
    name: 'cast_vote',
    inputs: [
      { name: 'nullifier_hash', type: 'core::felt252' },
      { name: 'vote_commitment', type: 'core::felt252' },
      { name: 'proof', type: 'core::array::Array::<core::felt252>' }
    ],
    outputs: [],
    state_mutability: 'external'
  }
] as const;
