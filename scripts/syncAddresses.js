const fs = require('fs');
const path = require('path');

function parseEnv(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function upsertAddress(entries, next) {
  const idx = entries.findIndex((e) => e.id === next.id);
  if (idx >= 0) entries[idx] = next;
  else entries.unshift(next);
}

function main() {
  const root = process.cwd();
  const envPath = path.join(root, '.env');
  const addressBookPath = path.join(root, 'frontend', 'public', 'address-book.json');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found in project root');
  }
  if (!fs.existsSync(addressBookPath)) {
    throw new Error('frontend/public/address-book.json not found');
  }

  const env = parseEnv(envPath);
  const book = JSON.parse(fs.readFileSync(addressBookPath, 'utf8'));
  const entries = Array.isArray(book) ? book : [];

  const privateVoting = env.CONTRACTS_PRIVATE_VOTING_ADDRESS;
  const mockVerifier = env.CONTRACTS_MOCK_VERIFIER_ADDRESS;
  const vvCoin = env.CONTRACTS_VV_COIN_ADDRESS;
  if (!privateVoting || !mockVerifier) {
    throw new Error(
      'Missing CONTRACTS_PRIVATE_VOTING_ADDRESS or CONTRACTS_MOCK_VERIFIER_ADDRESS in .env'
    );
  }

  upsertAddress(entries, {
    id: 'pv-private-voting',
    name: 'PrivateVoting',
    description: 'Private voting contract on Starknet',
    address: privateVoting,
  });
  upsertAddress(entries, {
    id: 'pv-mock-verifier',
    name: 'MockVerifier',
    description: 'Verifier contract used by PrivateVoting',
    address: mockVerifier,
  });
  if (vvCoin) {
    upsertAddress(entries, {
      id: 'pv-vv-coin',
      name: 'VV Coin',
      description: 'VoteVault governance token',
      address: vvCoin,
    });
  }

  fs.writeFileSync(addressBookPath, JSON.stringify(entries, null, 2) + '\n');
  console.log('Address book updated:', addressBookPath);
}

main();
