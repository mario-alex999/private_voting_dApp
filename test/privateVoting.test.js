const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMerkleTree,
  buildCircuitInputs,
  mockCircuitVerify,
  voterLeaf,
  voteCommitment,
  nullifierHash,
  VotingState,
} = require('../scripts/offchain/privateVoting');

test('merkle path + circuit relation verifies for eligible voter', () => {
  const electionId = 202501n;
  const identities = [11n, 12n, 13n, 14n];
  const leaves = identities.map((id) => voterLeaf(id, electionId));
  const tree = buildMerkleTree(leaves, 3);

  const inputs = buildCircuitInputs({
    identitySecret: 13n,
    electionId,
    vote: 1n,
    voteBlinding: 99n,
    tree,
    leafIndex: 2,
  });

  assert.equal(mockCircuitVerify(inputs), true);
});

test('circuit verification fails with wrong vote commitment', () => {
  const electionId = 42n;
  const leaves = [1n, 2n].map((id) => voterLeaf(id, electionId));
  const tree = buildMerkleTree(leaves, 2);

  const inputs = buildCircuitInputs({
    identitySecret: 2n,
    electionId,
    vote: 0n,
    voteBlinding: 10n,
    tree,
    leafIndex: 1,
  });

  inputs.publicInputs.vote_commitment = voteCommitment(1n, 10n, electionId);
  assert.equal(mockCircuitVerify(inputs), false);
});

test('one-person-one-vote nullifier replay protection works', () => {
  const electionId = 123n;
  const root = 555n;
  const state = new VotingState({ electionId, merkleRoot: root });

  const secret = 777n;
  const n = nullifierHash(secret, electionId);
  const c1 = voteCommitment(1n, 1n, electionId);
  const c2 = voteCommitment(0n, 2n, electionId);

  const idx = state.castVote({ nullifierHash: n, voteCommitment: c1, proofIsValid: true });
  assert.equal(idx, 0);

  assert.throws(
    () => state.castVote({ nullifierHash: n, voteCommitment: c2, proofIsValid: true }),
    /NULLIFIER_USED/
  );
});
