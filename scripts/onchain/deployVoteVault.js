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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseClassHash(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return `0x${value.toString(16)}`;
  if (value && typeof value.toString === 'function') {
    const asString = value.toString();
    return asString.startsWith('0x') ? asString : `0x${BigInt(asString).toString(16)}`;
  }
  return String(value);
}

async function declareAndDeploy(account, options) {
  const result = await account.declareAndDeploy({
    contract: readJson(options.sierraPath),
    casm: readJson(options.casmPath),
    constructorCalldata: options.constructorCalldata,
  });

  return {
    classHash: parseClassHash(result.declare.class_hash),
    address: result.deploy.contract_address,
    declareTx: result.declare.transaction_hash || '',
    deployTx: result.deploy.transaction_hash || '',
  };
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const envPath = path.join(root, '.env');
  const frontendEnvPath = path.join(root, 'frontend', '.env.local');
  const artifactsDir = path.join(root, 'contracts', 'target', 'dev');

  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing ${envPath}`);
  }

  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
  const rpcUrl = env.RPC_URL_SEPOLIA;
  const privateKey = env.PRIVATE_KEY_SEPOLIA;
  const accountAddress = env.ACCOUNT_ADDRESS_SEPOLIA;
  const initialSupply = env.VV_COIN_INITIAL_SUPPLY || '1000000';

  if (!rpcUrl || !privateKey || !accountAddress) {
    throw new Error(
      'Missing RPC_URL_SEPOLIA, PRIVATE_KEY_SEPOLIA, or ACCOUNT_ADDRESS_SEPOLIA in .env'
    );
  }

  const requiredArtifacts = [
    'contracts_MockVerifier.contract_class.json',
    'contracts_MockVerifier.compiled_contract_class.json',
    'contracts_VVCoin.contract_class.json',
    'contracts_VVCoin.compiled_contract_class.json',
    'contracts_PrivateVoting.contract_class.json',
    'contracts_PrivateVoting.compiled_contract_class.json',
  ];
  for (const name of requiredArtifacts) {
    const p = path.join(artifactsDir, name);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing artifact ${p}. Run: cd contracts && scarb build`);
    }
  }

  console.log('Using account:', accountAddress);
  console.log('RPC:', rpcUrl);

  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = new Account({
    provider,
    address: accountAddress,
    signer: privateKey,
  });

  console.log('\nDeclaring + deploying MockVerifier...');
  const mock = await declareAndDeploy(account, {
    sierraPath: path.join(artifactsDir, 'contracts_MockVerifier.contract_class.json'),
    casmPath: path.join(artifactsDir, 'contracts_MockVerifier.compiled_contract_class.json'),
    constructorCalldata: [true],
  });
  console.log('MockVerifier class:', mock.classHash);
  console.log('MockVerifier address:', mock.address);

  console.log('\nDeclaring + deploying VVCoin...');
  const vvCoin = await declareAndDeploy(account, {
    sierraPath: path.join(artifactsDir, 'contracts_VVCoin.contract_class.json'),
    casmPath: path.join(artifactsDir, 'contracts_VVCoin.compiled_contract_class.json'),
    constructorCalldata: [accountAddress, accountAddress, initialSupply],
  });
  console.log('VVCoin class:', vvCoin.classHash);
  console.log('VVCoin address:', vvCoin.address);

  console.log('\nDeclaring + deploying PrivateVoting...');
  const privateVoting = await declareAndDeploy(account, {
    sierraPath: path.join(artifactsDir, 'contracts_PrivateVoting.contract_class.json'),
    casmPath: path.join(artifactsDir, 'contracts_PrivateVoting.compiled_contract_class.json'),
    constructorCalldata: [mock.address, accountAddress, vvCoin.address],
  });
  console.log('PrivateVoting class:', privateVoting.classHash);
  console.log('PrivateVoting address:', privateVoting.address);

  const sharedValues = {
    NEXT_PUBLIC_STARKNET_RPC_URL: rpcUrl,
    NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS: privateVoting.address,
    NEXT_PUBLIC_MOCK_VERIFIER_ADDRESS: mock.address,
    NEXT_PUBLIC_VV_COIN_ADDRESS: vvCoin.address,
  };

  upsertEnvFile(envPath, {
    ...sharedValues,
    CONTRACTS_MOCK_VERIFIER_CLASS_HASH: mock.classHash,
    CONTRACTS_MOCK_VERIFIER_ADDRESS: mock.address,
    CONTRACTS_VV_COIN_CLASS_HASH: vvCoin.classHash,
    CONTRACTS_VV_COIN_ADDRESS: vvCoin.address,
    CONTRACTS_PRIVATE_VOTING_CLASS_HASH: privateVoting.classHash,
    CONTRACTS_PRIVATE_VOTING_ADDRESS: privateVoting.address,
  });
  upsertEnvFile(frontendEnvPath, sharedValues);

  const addressBookPath = path.join(root, 'frontend', 'public', 'address-book.json');
  if (fs.existsSync(addressBookPath)) {
    const raw = fs.readFileSync(addressBookPath, 'utf8');
    const entries = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    const next = [
      {
        id: 'vv-private-voting',
        name: 'PrivateVoting',
        description: 'VoteVault private voting + DAO governance contract',
        address: privateVoting.address,
      },
      {
        id: 'vv-mock-verifier',
        name: 'MockVerifier',
        description: 'VoteVault proof verifier contract',
        address: mock.address,
      },
      {
        id: 'vv-vv-coin',
        name: 'VV Coin',
        description: 'VoteVault governance token',
        address: vvCoin.address,
      },
    ];
    for (const candidate of next) {
      const idx = entries.findIndex((x) => x.id === candidate.id);
      if (idx >= 0) entries[idx] = candidate;
      else entries.unshift(candidate);
    }
    fs.writeFileSync(addressBookPath, `${JSON.stringify(entries, null, 2)}\n`);
  }

  console.log('\nDeployment complete.');
  console.log(JSON.stringify({
    mockVerifier: mock,
    vvCoin,
    privateVoting,
  }, null, 2));
}

main().catch((err) => {
  console.error('\nDeploy failed:', err?.message || err);
  process.exit(1);
});
