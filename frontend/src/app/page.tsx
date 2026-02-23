'use client';

import { useMemo, useState } from 'react';
import { AccountInterface, Contract, RpcProvider } from 'starknet';
import { PRIVATE_VOTING_ABI } from './abi';

type AuthMode = 'login' | 'register';

const rpcUrl =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';
const contractAddress = process.env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS || '';
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

declare global {
  interface Window {
    starknet?: {
      enable: () => Promise<string[]>;
      account: AccountInterface;
      selectedAddress?: string;
    };
  }
}

function parseProof(proofInput: string): string[] {
  return proofInput
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function Page() {
  const provider = useMemo(() => new RpcProvider({ nodeUrl: rpcUrl }), []);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [wallet, setWallet] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [nullifier, setNullifier] = useState('0x1');
  const [commitment, setCommitment] = useState('0x2');
  const [proof, setProof] = useState('0x123,0x456');
  const [chainVoteCount, setChainVoteCount] = useState<string>('n/a');
  const [electionConfig, setElectionConfig] = useState<string>('not loaded');

  async function connectWallet() {
    if (!window.starknet) {
      setStatus('No Starknet wallet found (Argent X / Braavos).');
      return;
    }

    await window.starknet.enable();
    setWallet(window.starknet.selectedAddress || 'Connected');
    setStatus('Wallet connected.');
  }

  async function authenticate() {
    try {
      const route = authMode === 'login' ? 'login' : 'register';
      const body =
        authMode === 'login'
          ? { email, password }
          : { username, email, password };

      const response = await fetch(`${backendUrl}/api/users/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error || 'Authentication failed');
        return;
      }

      setToken(payload.token);
      setStatus(`Authenticated: ${payload.user.email}`);
    } catch (error) {
      setStatus(`Auth request failed: ${(error as Error).message}`);
    }
  }

  async function refreshElectionData() {
    if (!contractAddress) {
      setStatus('Set NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS in frontend/.env.local.');
      return;
    }

    const contract = new Contract(PRIVATE_VOTING_ABI, contractAddress, provider);
    const countResponse = await contract.call('get_vote_count', []);
    const configResponse = await contract.call('get_election_config', []);

    setChainVoteCount(String(countResponse));
    setElectionConfig(JSON.stringify(configResponse));
  }

  async function castVote() {
    if (!token) {
      setStatus('Login/register first so backend can record your vote state.');
      return;
    }
    if (!window.starknet?.account) {
      setStatus('Connect wallet first.');
      return;
    }
    if (!contractAddress) {
      setStatus('Set NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS in frontend/.env.local.');
      return;
    }

    const proofArray = parseProof(proof);
    if (proofArray.length === 0) {
      setStatus('Proof array cannot be empty.');
      return;
    }

    try {
      setStatus('Submitting vote to Starknet...');

      const contract = new Contract(PRIVATE_VOTING_ABI, contractAddress, provider);
      contract.connect(window.starknet.account);

      const tx = await contract.invoke('cast_vote', [nullifier, commitment, proofArray]);
      await provider.waitForTransaction(tx.transaction_hash);

      const backendResponse = await fetch(`${backendUrl}/api/users/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nullifierHash: nullifier,
          voteCommitment: commitment,
          txHash: tx.transaction_hash,
        }),
      });

      const backendPayload = await backendResponse.json();
      if (!backendResponse.ok) {
        setStatus(
          `On-chain vote succeeded (${tx.transaction_hash}) but backend failed: ${backendPayload.error}`,
        );
        return;
      }

      setStatus(`Vote accepted on-chain and backend: ${tx.transaction_hash}`);
      await refreshElectionData();
    } catch (error) {
      setStatus(`Vote failed: ${(error as Error).message}`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Private Voting dApp Integration</h1>
      <p>Integrated flow: Backend auth + Starknet vote + backend vote-state recording.</p>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-semibold">1) Authenticate (backend)</h2>
        <div className="flex gap-2">
          <button onClick={() => setAuthMode('login')} className="rounded border px-3 py-1">
            Login
          </button>
          <button onClick={() => setAuthMode('register')} className="rounded border px-3 py-1">
            Register
          </button>
        </div>

        {authMode === 'register' && (
          <input
            className="w-full rounded border p-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <input
          className="w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={authenticate} className="rounded border px-3 py-1">
          {authMode === 'login' ? 'Login' : 'Register'}
        </button>
        <p>JWT loaded: {token ? 'Yes' : 'No'}</p>
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-semibold">2) Connect wallet (frontend)</h2>
        <button onClick={connectWallet} className="rounded border px-3 py-1">
          Connect Starknet Wallet
        </button>
        <p>Wallet: {wallet || 'Not connected'}</p>
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="font-semibold">3) Submit proof to contract + record backend vote status</h2>
        <label className="block">Nullifier hash</label>
        <input
          className="w-full rounded border p-2"
          value={nullifier}
          onChange={(e) => setNullifier(e.target.value)}
        />
        <label className="block">Vote commitment</label>
        <input
          className="w-full rounded border p-2"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
        />
        <label className="block">Proof felts (comma separated)</label>
        <textarea
          className="w-full rounded border p-2"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          <button onClick={castVote} className="rounded border px-3 py-1">
            Cast Vote
          </button>
          <button onClick={refreshElectionData} className="rounded border px-3 py-1">
            Refresh Election Data
          </button>
        </div>
        <p>On-chain vote count: {chainVoteCount}</p>
        <p>Election config: {electionConfig}</p>
      </section>

      <p className="rounded border border-dashed p-3">Status: {status || 'idle'}</p>
    </main>
  );
}
