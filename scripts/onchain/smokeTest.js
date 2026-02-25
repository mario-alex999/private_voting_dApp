const { RpcProvider, Account, CallData } = require('starknet');

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

async function invoke(account, contractAddress, entrypoint, calldata) {
  const tx = await account.execute({
    contractAddress,
    entrypoint,
    calldata,
  });
  await account.waitForTransaction(tx.transaction_hash);
  return tx.transaction_hash;
}

async function main() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));

  const rpcUrl = env.RPC_URL_SEPOLIA;
  const privateKey = env.PRIVATE_KEY_SEPOLIA;
  const accountAddress = env.ACCOUNT_ADDRESS_SEPOLIA;
  const privateVotingAddress = env.CONTRACTS_PRIVATE_VOTING_ADDRESS;

  if (!rpcUrl || !privateKey || !accountAddress || !privateVotingAddress) {
    throw new Error(
      'Missing RPC_URL_SEPOLIA, PRIVATE_KEY_SEPOLIA, ACCOUNT_ADDRESS_SEPOLIA, or CONTRACTS_PRIVATE_VOTING_ADDRESS in .env'
    );
  }

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account(provider, accountAddress, privateKey);

  const now = Math.floor(Date.now() / 1000);
  const electionId = BigInt(now);
  const merkleRoot = 1234n;
  const nullifier = 7777n;
  const commitment = 8888n;
  const proof = [1n];

  console.log('Opening voting window...');
  const openCalldata = CallData.compile({
    election_id: electionId,
    merkle_root: merkleRoot,
    start_time: BigInt(now - 5),
    end_time: BigInt(now + 600),
  });
  const openTx = await invoke(account, privateVotingAddress, 'open_voting', openCalldata);
  console.log('open_voting tx:', openTx);

  console.log('Casting first vote...');
  const voteCalldata = CallData.compile({
    nullifier_hash: nullifier,
    vote_commitment: commitment,
    proof,
  });
  const voteTx = await invoke(account, privateVotingAddress, 'cast_vote', voteCalldata);
  console.log('cast_vote tx:', voteTx);

  console.log('Casting replay vote (expected to fail)...');
  try {
    await invoke(account, privateVotingAddress, 'cast_vote', voteCalldata);
    throw new Error('Replay was unexpectedly accepted');
  } catch (err) {
    const message = String(err?.message || err);
    if (message.includes('NULLIFIER_USED')) {
      console.log('Replay protection verified: NULLIFIER_USED');
    } else {
      console.log('Replay reverted (non-decoded reason):', message);
    }
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
