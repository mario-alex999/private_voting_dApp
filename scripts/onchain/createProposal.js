const fs = require('fs');
const path = require('path');
const { RpcProvider, Account, CallData, shortString } = require('starknet');

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value.replace(/\\n/g, '').replace(/\\r/g, '').trim();
  }
  return out;
}

async function main() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env in project root');
  }
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));

  const rpcUrl = env.RPC_URL_SEPOLIA || env.NEXT_PUBLIC_STARKNET_RPC_URL;
  const privateKey = env.PRIVATE_KEY_SEPOLIA;
  const accountAddress = env.ACCOUNT_ADDRESS_SEPOLIA;
  const privateVotingAddress =
    env.CONTRACTS_PRIVATE_VOTING_ADDRESS || env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS;

  if (!rpcUrl || !privateKey || !accountAddress || !privateVotingAddress) {
    throw new Error(
      'Missing RPC_URL_SEPOLIA, PRIVATE_KEY_SEPOLIA, ACCOUNT_ADDRESS_SEPOLIA, or CONTRACTS_PRIVATE_VOTING_ADDRESS in .env',
    );
  }

  const title = process.argv.slice(2).join(' ').trim() || 'VV DAO SNAPSHOT UPDATE';
  if (title.length > 31) {
    throw new Error('Proposal title must be <= 31 characters.');
  }
  const now = Math.floor(Date.now() / 1000);
  const days = Number(process.env.PROPOSAL_DEADLINE_DAYS || '7');
  const deadline = now + Math.max(1, Math.floor(days)) * 24 * 60 * 60;

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  console.log('Creating proposal...');
  console.log('Admin account:', accountAddress);
  console.log('PrivateVoting:', privateVotingAddress);
  console.log('Title:', title);
  console.log('Deadline (unix):', deadline);

  const tx = await account.execute({
    contractAddress: privateVotingAddress,
    entrypoint: 'create_proposal',
    calldata: CallData.compile({
      title: shortString.encodeShortString(title),
      deadline: BigInt(deadline),
    }),
  });
  await provider.waitForTransaction(tx.transaction_hash);
  console.log('create_proposal tx:', tx.transaction_hash);

  const countResp = await provider.callContract({
    contractAddress: privateVotingAddress,
    entrypoint: 'get_proposal_count',
    calldata: [],
  });
  const countArr = Array.isArray(countResp) ? countResp : countResp.result;
  const count = Number(BigInt(countArr[0] || 0));
  console.log('Updated proposal_count:', count);
}

main().catch((err) => {
  console.error('createProposal failed:', err?.message || err);
  process.exit(1);
});
