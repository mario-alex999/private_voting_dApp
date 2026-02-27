const fs = require('fs');
const path = require('path');
const { RpcProvider, Account, CallData } = require('starknet');

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
  if (!fs.existsSync(envPath)) throw new Error('Missing .env in project root');
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));

  const rpcUrl = env.RPC_URL_SEPOLIA || env.NEXT_PUBLIC_STARKNET_RPC_URL;
  const privateKey = env.PRIVATE_KEY_SEPOLIA;
  const accountAddress = env.ACCOUNT_ADDRESS_SEPOLIA;
  const privateVotingAddress =
    env.CONTRACTS_PRIVATE_VOTING_ADDRESS || env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS;
  const vvCoinAddress = env.CONTRACTS_VV_COIN_ADDRESS || env.NEXT_PUBLIC_VV_COIN_ADDRESS;

  if (!rpcUrl || !privateKey || !accountAddress || !privateVotingAddress) {
    throw new Error(
      'Missing RPC_URL_SEPOLIA/NEXT_PUBLIC_STARKNET_RPC_URL, PRIVATE_KEY_SEPOLIA, ACCOUNT_ADDRESS_SEPOLIA, or CONTRACTS_PRIVATE_VOTING_ADDRESS in .env',
    );
  }

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  const countResp = await provider.callContract({
    contractAddress: privateVotingAddress,
    entrypoint: 'get_proposal_count',
    calldata: [],
  });
  const countArr = Array.isArray(countResp) ? countResp : countResp.result;
  const proposalCount = Number(BigInt(countArr[0] || 0));
  if (proposalCount === 0) throw new Error('No on-chain proposals found. Create one first.');

  const proposalArg = process.argv[2];
  const supportArg = (process.argv[3] || 'for').toLowerCase();
  const support = supportArg !== 'against';
  const proposalId =
    proposalArg === undefined ? BigInt(proposalCount - 1) : BigInt(proposalArg.trim());

  const proof = [1n, 2n];
  let weight = 1n;
  if (process.argv[4]) {
    weight = BigInt(process.argv[4].trim());
  } else if (vvCoinAddress) {
    const balanceResp = await provider.callContract({
      contractAddress: vvCoinAddress,
      entrypoint: 'balance_of',
      calldata: CallData.compile({ account: accountAddress }),
    });
    const balanceArr = Array.isArray(balanceResp) ? balanceResp : balanceResp.result;
    const balance = BigInt(balanceArr[0] || 0);
    if (balance > 0n) weight = balance;
  }
  if (weight <= 0n) throw new Error('Vote weight must be greater than zero.');

  const nullifier = 0x1000000000000n + BigInt(Date.now());

  console.log('Submitting vote...');
  console.log('Voter:', accountAddress);
  console.log('PrivateVoting:', privateVotingAddress);
  console.log('Proposal ID:', proposalId.toString());
  console.log('Support:', support);
  console.log('Weight:', weight.toString());
  console.log('Nullifier:', `0x${nullifier.toString(16)}`);

  const tx = await account.execute({
    contractAddress: privateVotingAddress,
    entrypoint: 'vote_on_proposal',
    calldata: CallData.compile({
      proposal_id: proposalId,
      support,
      weight,
      nullifier_hash: `0x${nullifier.toString(16)}`,
      proof,
    }),
  });
  await provider.waitForTransaction(tx.transaction_hash);
  console.log('vote_on_proposal tx:', tx.transaction_hash);

  const proposalResp = await provider.callContract({
    contractAddress: privateVotingAddress,
    entrypoint: 'get_proposal',
    calldata: CallData.compile({ proposal_id: proposalId }),
  });
  const proposalArr = Array.isArray(proposalResp) ? proposalResp : proposalResp.result;
  const forVotes = BigInt(proposalArr[3] || 0n);
  const againstVotes = BigInt(proposalArr[4] || 0n);
  console.log('Updated tally:', {
    for_votes: forVotes.toString(),
    against_votes: againstVotes.toString(),
  });
}

main().catch((err) => {
  console.error('voteProposal failed:', err?.message || err);
  process.exit(1);
});
