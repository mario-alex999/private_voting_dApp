const MOD = (1n << 251n) - 9n;
const { hash } = require('starknet');

function toField(v) {
  const n = BigInt(v);
  const out = n % MOD;
  return out >= 0n ? out : out + MOD;
}

function hash2(a, b) {
  return toField(BigInt(hash.computePoseidonHash(toField(a), toField(b))));
}

function hash3(a, b, c) {
  return hash2(hash2(a, b), c);
}

function voterLeaf(identitySecret, electionId) {
  return hash2(identitySecret, electionId);
}

function nullifierHash(identitySecret, electionId) {
  return hash3(identitySecret, electionId, 1n);
}

function voteCommitment(vote, voteBlinding, electionId) {
  if (vote !== 0n && vote !== 1n) {
    throw new Error('vote must be 0 or 1');
  }
  return hash3(vote, voteBlinding, electionId);
}

function tokenBalanceLeaf(identitySecret, tokenBalance, electionId) {
  return hash3(identitySecret, tokenBalance, electionId);
}

function proposalNullifierHash(identitySecret, electionId, proposalId) {
  return hash3(identitySecret, electionId, proposalId);
}

function buildMerkleTree(leaves, depth = 20) {
  if (leaves.length === 0) throw new Error('at least one leaf is required');
  const zeroLeaf = 0n;
  const maxLeaves = 1 << depth;
  if (leaves.length > maxLeaves) throw new Error(`too many leaves for depth ${depth}`);

  let level = Array.from({ length: maxLeaves }, (_, i) => toField(leaves[i] ?? zeroLeaf));
  const layers = [level];

  for (let d = 0; d < depth; d += 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(hash2(level[i], level[i + 1]));
    }
    level = next;
    layers.push(level);
  }

  return { depth, layers, root: layers[layers.length - 1][0] };
}

function buildMerkleProof(tree, index) {
  const { depth, layers } = tree;
  if (index < 0 || index >= layers[0].length) throw new Error('index out of range');
  const path = [];
  const indexBits = [];

  let idx = index;
  for (let d = 0; d < depth; d += 1) {
    const sibling = idx ^ 1;
    path.push(layers[d][sibling]);
    indexBits.push(BigInt(idx & 1));
    idx = Math.floor(idx / 2);
  }

  return { path, indexBits };
}

function verifyMerklePath(leaf, root, path, indexBits) {
  if (path.length !== indexBits.length) return false;
  let cur = toField(leaf);
  for (let i = 0; i < path.length; i += 1) {
    const bit = Number(indexBits[i]);
    if (bit === 0) cur = hash2(cur, path[i]);
    else if (bit === 1) cur = hash2(path[i], cur);
    else return false;
  }
  return cur === toField(root);
}

function buildCircuitInputs({ identitySecret, electionId, vote, voteBlinding, tree, leafIndex }) {
  const secret = toField(identitySecret);
  const election = toField(electionId);
  const leaf = voterLeaf(secret, election);
  const { path, indexBits } = buildMerkleProof(tree, leafIndex);
  const nullifier = nullifierHash(secret, election);
  const commitment = voteCommitment(BigInt(vote), toField(voteBlinding), election);

  return {
    publicInputs: {
      election_id: election,
      merkle_root: tree.root,
      nullifier_hash: nullifier,
      vote_commitment: commitment,
    },
    privateInputs: {
      identity_secret: secret,
      voter_leaf: leaf,
      path,
      index_bits: indexBits,
      vote: BigInt(vote),
      vote_blinding: toField(voteBlinding),
    },
  };
}

function buildTokenWeightedCircuitInputs({
  identitySecret,
  electionId,
  proposalId,
  support,
  tokenBalance,
  weight,
  tree,
  leafIndex,
}) {
  const secret = toField(identitySecret);
  const election = toField(electionId);
  const proposal = toField(proposalId);
  const supportBit = BigInt(support);
  if (supportBit !== 0n && supportBit !== 1n) {
    throw new Error('support must be 0 or 1');
  }

  const balance = toField(tokenBalance);
  const weightField = toField(weight);
  if (weightField !== balance) {
    throw new Error('weight must equal token balance for this circuit');
  }

  const leaf = tokenBalanceLeaf(secret, balance, election);
  const { path, indexBits } = buildMerkleProof(tree, leafIndex);
  const nullifier = proposalNullifierHash(secret, election, proposal);

  return {
    publicInputs: {
      election_id: election,
      merkle_root: tree.root,
      proposal_id: proposal,
      support: supportBit,
      weight: weightField,
      nullifier_hash: nullifier,
    },
    privateInputs: {
      identity_secret: secret,
      token_balance: balance,
      voter_leaf: leaf,
      path,
      index_bits: indexBits,
    },
  };
}

function mockCircuitVerify({ publicInputs, privateInputs }) {
  const {
    election_id: electionId,
    merkle_root: merkleRoot,
    nullifier_hash: pubNullifier,
    vote_commitment: pubCommitment,
  } = publicInputs;

  const { identity_secret: secret, voter_leaf: leaf, path, index_bits: indexBits, vote, vote_blinding: blinding } = privateInputs;

  if (vote !== 0n && vote !== 1n) return false;
  if (!verifyMerklePath(leaf, merkleRoot, path, indexBits)) return false;
  if (leaf !== voterLeaf(secret, electionId)) return false;
  if (pubNullifier !== nullifierHash(secret, electionId)) return false;
  if (pubCommitment !== voteCommitment(vote, blinding, electionId)) return false;
  return true;
}

function mockTokenWeightedCircuitVerify({ publicInputs, privateInputs }) {
  const {
    election_id: electionId,
    merkle_root: merkleRoot,
    proposal_id: proposalId,
    support,
    weight,
    nullifier_hash: pubNullifier,
  } = publicInputs;

  const {
    identity_secret: secret,
    token_balance: balance,
    voter_leaf: leaf,
    path,
    index_bits: indexBits,
  } = privateInputs;

  if (support !== 0n && support !== 1n) return false;
  if (!verifyMerklePath(leaf, merkleRoot, path, indexBits)) return false;
  if (leaf !== tokenBalanceLeaf(secret, balance, electionId)) return false;
  if (weight !== balance) return false;
  if (pubNullifier !== proposalNullifierHash(secret, electionId, proposalId)) return false;
  return true;
}

class VotingState {
  constructor({ electionId, merkleRoot }) {
    this.electionId = toField(electionId);
    this.merkleRoot = toField(merkleRoot);
    this.usedNullifiers = new Set();
    this.commitments = [];
  }

  castVote({ nullifierHash: n, voteCommitment: c, proofIsValid }) {
    const key = toField(n).toString();
    if (this.usedNullifiers.has(key)) throw new Error('NULLIFIER_USED');
    if (!proofIsValid) throw new Error('INVALID_PROOF');

    this.usedNullifiers.add(key);
    this.commitments.push(toField(c));
    return this.commitments.length - 1;
  }
}

module.exports = {
  MOD,
  toField,
  hash2,
  hash3,
  voterLeaf,
  nullifierHash,
  voteCommitment,
  tokenBalanceLeaf,
  proposalNullifierHash,
  buildMerkleTree,
  buildMerkleProof,
  verifyMerklePath,
  buildCircuitInputs,
  buildTokenWeightedCircuitInputs,
  mockCircuitVerify,
  mockTokenWeightedCircuitVerify,
  VotingState,
};
