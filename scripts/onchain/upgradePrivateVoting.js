const fs = require('fs');
const path = require('path');
const { RpcProvider, Account } = require('starknet');

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

function upsertEnvFile(filePath, kv) {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const lines = content === '' ? [] : content.split(/\r?\n/);
  const byKey = new Map();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 0) return;
    byKey.set(trimmed.slice(0, eq).trim(), idx);
  });

  for (const [k, v] of Object.entries(kv)) {
    const nextLine = `${k}=${v}`;
    if (byKey.has(k)) {
      lines[byKey.get(k)] = nextLine;
    } else {
      lines.push(nextLine);
    }
  }

  const normalized = `${lines.filter((l) => l !== undefined).join('\n').replace(/\n*$/, '\n')}`;
  fs.writeFileSync(filePath, normalized);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(__dirname, '..', '..');
  const envPath = path.join(root, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing ${envPath}`);
  }

  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));

  const rpcUrl = env.RPC_URL_SEPOLIA;
  const privateKey = env.PRIVATE_KEY_SEPOLIA;
  const accountAddress = env.ACCOUNT_ADDRESS_SEPOLIA;

  const privateVotingAddress =
    args.contract || env.CONTRACTS_PRIVATE_VOTING_ADDRESS || env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS;

  const newClassHash = args['class-hash'] || env.NEW_PRIVATE_VOTING_CLASS_HASH;
  const nextVerifier = args.verifier || '';

  if (!rpcUrl || !privateKey || !accountAddress) {
    throw new Error('Missing RPC_URL_SEPOLIA, PRIVATE_KEY_SEPOLIA, or ACCOUNT_ADDRESS_SEPOLIA in .env');
  }

  if (!privateVotingAddress) {
    throw new Error('Missing target contract address. Provide --contract or set CONTRACTS_PRIVATE_VOTING_ADDRESS');
  }

  if (!newClassHash) {
    throw new Error('Missing new class hash. Provide --class-hash or set NEW_PRIVATE_VOTING_CLASS_HASH');
  }

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  const calls = [
    {
      contractAddress: privateVotingAddress,
      entrypoint: 'upgrade',
      calldata: [newClassHash],
    },
  ];

  if (nextVerifier) {
    calls.push({
      contractAddress: privateVotingAddress,
      entrypoint: 'set_verifier',
      calldata: [nextVerifier],
    });
  }

  console.log('Sending upgrade tx...');
  const tx = await account.execute(calls);
  const txHash = tx.transaction_hash || tx.transactionHash;

  if (!txHash) {
    throw new Error('Could not get transaction hash from upgrade execution');
  }

  await provider.waitForTransaction(txHash);

  upsertEnvFile(envPath, {
    CONTRACTS_PRIVATE_VOTING_CLASS_HASH: newClassHash,
    CONTRACTS_PRIVATE_VOTING_ADDRESS: privateVotingAddress,
    ...(nextVerifier ? { CONTRACTS_MOCK_VERIFIER_ADDRESS: nextVerifier } : {}),
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        transactionHash: txHash,
        privateVotingAddress,
        newClassHash,
        nextVerifier: nextVerifier || null,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('\nUpgrade failed:', err?.message || err);
  process.exit(1);
});
