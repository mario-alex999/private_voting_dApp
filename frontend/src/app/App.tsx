import { useMemo, useState } from 'react';
import { AccountInterface, Contract, RpcProvider } from 'starknet';
import { PRIVATE_VOTING_ABI } from './abi';

const rpcUrl =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';
const contractAddress = process.env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS || '';

declare global {
  interface Window {
    starknet?: {
      enable: () => Promise<string[]>;
      account: AccountInterface;
      selectedAddress?: string;
      isConnected?: boolean;
    };
  }
}

function parseProof(proofInput: string): string[] {
  return proofInput
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function App() {
  const [wallet, setWallet] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [nullifier, setNullifier] = useState('0x1');
  const [commitment, setCommitment] = useState('0x2');
  const [proof, setProof] = useState('0x123,0x456');

  const provider = useMemo(() => new RpcProvider({ nodeUrl: rpcUrl }), []);

  async function connect() {
    if (!window.starknet) {
      setStatus('No Starknet wallet found (Argent X / Braavos).');
      return;
    }

    await window.starknet.enable();
    setWallet(window.starknet.selectedAddress || 'Connected');
    setStatus('Wallet connected.');
  }

  async function castVote() {
    if (!window.starknet?.account) {
      setStatus('Connect wallet first.');
      return;
    }
    if (!contractAddress) {
      setStatus('Set NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS in frontend env.');
      return;
    }

    const proofArray = parseProof(proof);
    if (proofArray.length === 0) {
      setStatus('Proof array cannot be empty.');
      return;
    }

    const contract = new Contract(PRIVATE_VOTING_ABI, contractAddress, provider);
    // attach the account (connect returns void for this API)
    contract.connect((window as any).starknet.account);

    setStatus('Submitting vote...');
    const tx = await contract.invoke('cast_vote', [
      nullifier,
      commitment,
      ...proofArray,
    ]);
    await provider.waitForTransaction(tx.transaction_hash);
    setStatus(`Vote accepted: ${tx.transaction_hash}`);
  }

  return (
    <main className="container">
      <h1>Private Voting on Starknet</h1>
      <p>Scaffolded fullstack: Cairo contracts + Noir circuit + React frontend.</p>
      <button onClick={connect}>Connect Wallet</button>
      <p>Wallet: {wallet || 'Not connected'}</p>
      <label>Nullifier hash</label>
      <input value={nullifier} onChange={(e) => setNullifier(e.target.value)} />
      <label>Vote commitment</label>
      <input value={commitment} onChange={(e) => setCommitment(e.target.value)} />
      <label>Proof felts (comma separated)</label>
      <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={4} />
      <button onClick={castVote}>Cast Vote</button>
      <p>{status}</p>
    </main>
  );

  
}
