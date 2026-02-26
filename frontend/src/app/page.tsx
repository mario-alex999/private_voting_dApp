"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { CallData, RpcProvider, shortString } from 'starknet';
import { 
  Lock, LayoutDashboard, Menu, X as CloseIcon,
  MessageSquare, 
  FileText, LogOut, Search, ChevronRight, 
  ChevronLeft, Copy, ChevronDown, CheckCircle2,
  Plus, ShieldCheck, Zap, Globe, Database, Share2, EyeOff, Clock, Ban, Shield, Calendar, Send, Mail, ArrowUpRight, Fingerprint, UserCheck,Sun,Moon
} from 'lucide-react';

const rpcUrl =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10';
const privateVotingAddress = process.env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS || '';
const vvCoinAddressFromEnv = process.env.NEXT_PUBLIC_VV_COIN_ADDRESS || '';

type WalletName = 'Braavos' | 'Argent X' | 'Starknet Wallet';
type ProposalStatus = 'Live' | 'Passed' | 'Pending' | 'Rejected';

type Proposal = {
  id: number;
  contractId?: number;
  title: string;
  summary: string;
  motivation?: string;
  deadline: string;
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  voters: number;
  hasVoted: boolean;
  tag: string;
  quorum: number;
};

type InjectedStarknetWallet = {
  enable: (options?: unknown) => Promise<string[]>;
  selectedAddress?: string;
  provider?: {
    chainId?: string;
    getChainId?: () => Promise<string>;
  };
  account?: {
    address?: string;
    execute?: (calls: unknown) => Promise<{ transaction_hash?: string; transactionHash?: string }>;
  };
};

const CONNECT_WALLETS: Array<{ name: WalletName; logo: string; desc: string }> = [
  {
    name: 'Braavos',
    logo: '/wallets/braavos.svg',
    desc: 'Starknet Smart Wallet',
  },
  {
    name: 'Argent X',
    logo: '/wallets/argent-x.svg',
    desc: 'The Gateway to Starknet',
  },
  {
    name: 'Starknet Wallet',
    logo: '/starknetlogo.svg',
    desc: 'Starknet Browser Wallet',
  },
];

const WALLET_SESSION_KEY = 'votevault_wallet_session_v1';

const DEFAULT_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: "Increase Validator Rewards by 15%",
    summary: "Adjusting validator staking rewards to ensure network liveness.",
    motivation: "Validator count has dropped by 12% over the last quarter.",
    deadline: "2026-03-15",
    status: "Live",
    forVotes: 15650,
    againstVotes: 4200,
    voters: 847,
    hasVoted: false,
    tag: "Technical",
    quorum: 42
  },
  {
    id: 2,
    title: "Strategic Treasury Diversification",
    summary: "Moving protocol reserves into stETH for better yield.",
    deadline: "2026-02-28",
    status: "Pending",
    forVotes: 0,
    againstVotes: 0,
    voters: 0,
    hasVoted: false,
    tag: "Treasury",
    quorum: 15
  },
  {
    id: 3,
    title: "Global Ambassador Program",
    summary: "Marketing budget for regional adoption leads.",
    deadline: "2026-01-10",
    status: "Passed",
    forVotes: 25000,
    againstVotes: 1200,
    voters: 1100,
    hasVoted: false,
    tag: "Community",
    quorum: 65
  }
];

export default function VoteVault() {
   // --- THEME STATE ---
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const team = [
    { name: "Amuka Treasure", role: "UI/UX Designer", img: "amuka.jpg" },
    { name: "Onyeka Princecharles", role: "Frontend Dev", img: "prinz.jpg" },
    { name: "Muhammed Abdullahi", role: "Backend Architect", img: "IMG-20260222-WA0009.jpg" },
    { name: "Obi Akachukwu", role: "Smart-contract dev", img: "IMG-20260223-WA0001.jpg" }
  ];

  const faqs = [
    { q: "Is my vote really anonymous?", a: "Yes. Using Zero-Knowledge Proofs, we verify your right to vote without revealing your identity or wallet address." },
    { q: "What wallets are supported?", a: "We currently support Argent X, Braavos, and Starknet Wallet." },
    { q: "How are results verified?", a: "All results are settled on-chain where the cryptographic proof can be audited by anyone." }
  ];
  // --- CORE DATA ---
  const testimonials = [
    { quote: "VoteVault transformed our DAO's governance. Participation is up 40% now that voting is truly private.", author: "Alex R.", role: "Lead at NexusDAO" },
    { quote: "The zero-knowledge proofs offer a level of security we haven't seen in the Web3 space yet.", author: "Sarah J.", role: "Security Auditor" },
    { quote: "Clean, fast, and professional. The only platform we trust for treasury decisions.", author: "Marcus K.", role: "Treasury Manager" }
  ];

  // --- COMPONENT STATE ---
  const [view, setView] = useState('landing'); 
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // --- WALLET & AUTH STATE ---
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState<InjectedStarknetWallet['account'] | null>(null);
  const [tokenAddress, setTokenAddress] = useState(vvCoinAddressFromEnv);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [adminAuthInput, setAdminAuthInput] = useState('');
  const provider = useMemo(() => new RpcProvider({ nodeUrl: rpcUrl }), []);

  // --- PROPOSALS DATA STATE ---
  const [proposals, setProposals] = useState<Proposal[]>(DEFAULT_PROPOSALS);

  const [selectedProposal, setSelectedProposal] = useState(proposals[0]);

  // --- NEW PROPOSAL FORM STATE ---
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formMotivation, setFormMotivation] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formTag, setFormTag] = useState('Technical');
  const [mintRecipient, setMintRecipient] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [daoVoteWeight, setDaoVoteWeight] = useState('');
  const [daoVoteNullifier, setDaoVoteNullifier] = useState('');
  const [daoVoteProof, setDaoVoteProof] = useState('');

  // --- LOGIC & HELPERS ---
  const toResult = (response: unknown): string[] => {
    if (Array.isArray(response)) return response.map(String);
    if (response && typeof response === 'object' && 'result' in response && Array.isArray((response as { result: unknown[] }).result)) {
      return (response as { result: unknown[] }).result.map(String);
    }
    return [];
  };

  const toBigInt = (value: unknown) => BigInt(String(value));

  const resolveStatus = (deadlineTs: number, isOpen: boolean, forVotes: number, againstVotes: number): ProposalStatus => {
    const now = Math.floor(Date.now() / 1000);
    if (isOpen && now <= deadlineTs) return 'Live';
    if (now <= deadlineTs) return 'Pending';
    return forVotes >= againstVotes ? 'Passed' : 'Rejected';
  };

  const resolveTokenAddress = async () => {
    if (tokenAddress) return tokenAddress;
    if (!privateVotingAddress) return '';
    const response = await provider.callContract({
      contractAddress: privateVotingAddress,
      entrypoint: 'get_token_address',
      calldata: [],
    });
    const result = toResult(response);
    const found = result[0] || '';
    if (found) setTokenAddress(found);
    return found;
  };

  const waitForTx = async (tx: { transaction_hash?: string; transactionHash?: string }) => {
    const hash = tx.transaction_hash || tx.transactionHash;
    if (!hash) throw new Error('Missing transaction hash from wallet response.');
    await provider.waitForTransaction(hash);
    return hash;
  };

  const refreshTokenBalance = async (addressToCheck?: string) => {
    const accountToCheck = addressToCheck || walletAddress;
    if (!accountToCheck) return;
    const coinAddress = await resolveTokenAddress();
    if (!coinAddress) return;
    const response = await provider.callContract({
      contractAddress: coinAddress,
      entrypoint: 'balance_of',
      calldata: CallData.compile({ account: accountToCheck }),
    });
    const result = toResult(response);
    setTokenBalance((toBigInt(result[0] || 0)).toString());
  };

  const loadOnchainProposals = async (addressToCheck?: string) => {
    if (!privateVotingAddress) return;
    try {
      const countResponse = await provider.callContract({
        contractAddress: privateVotingAddress,
        entrypoint: 'get_proposal_count',
        calldata: [],
      });
      const count = Number(toBigInt(toResult(countResponse)[0] || 0));
      if (count === 0) return;

      const onchain: Proposal[] = [];
      for (let i = 0; i < count; i += 1) {
        const proposalResponse = await provider.callContract({
          contractAddress: privateVotingAddress,
          entrypoint: 'get_proposal',
          calldata: CallData.compile({ proposal_id: i }),
        });
        const proposalResult = toResult(proposalResponse);
        const titleFelt = proposalResult[0] || '0x0';
        const deadlineTs = Number(toBigInt(proposalResult[1] || 0));
        const isOpen = toBigInt(proposalResult[2] || 0) === BigInt(1);
        const forVotes = Number(toBigInt(proposalResult[3] || 0));
        const againstVotes = Number(toBigInt(proposalResult[4] || 0));

        let decodedTitle = `Proposal #${i + 1}`;
        try {
          decodedTitle = shortString.decodeShortString(titleFelt);
        } catch {
          decodedTitle = `Proposal #${i + 1}`;
        }

        const totalVotes = forVotes + againstVotes;
        onchain.push({
          id: i + 1,
          contractId: i,
          title: decodedTitle,
          summary: 'On-chain DAO proposal stored in VoteVault.',
          motivation: 'Token-weighted governance where voting power is based on VV Coin balance.',
          deadline: deadlineTs > 0 ? new Date(deadlineTs * 1000).toISOString().slice(0, 10) : 'N/A',
          status: resolveStatus(deadlineTs, isOpen, forVotes, againstVotes),
          forVotes,
          againstVotes,
          voters: totalVotes,
          hasVoted: false,
          tag: 'DAO',
          quorum: totalVotes > 0 ? Math.min(100, Math.round((totalVotes / 1000) * 100)) : 0,
        });
      }

      const sorted = [...onchain].sort((a, b) => b.id - a.id);
      setProposals(sorted);
      const selectedFromFresh = sorted.find((p) => p.id === selectedProposal.id) || sorted[0];
      if (selectedFromFresh) setSelectedProposal(selectedFromFresh);
    } catch (error) {
      console.error('Failed to load on-chain proposals:', error);
    }
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || p.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [proposals, searchQuery, activeFilter]);

  const getPercentages = (forV: number, againstV: number) => {
    const total = forV + againstV || 1;
    return { forP: (forV / total) * 100, againstP: (againstV / total) * 100 };
  };

  const getTagStyle = (status: string) => {
    switch(status) {
      case 'Live': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Passed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  const persistWalletSession = (walletType: WalletName, address: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      WALLET_SESSION_KEY,
      JSON.stringify({ walletType, walletAddress: address }),
    );
  };

  const clearWalletSession = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WALLET_SESSION_KEY);
  };

  const disconnectWallet = () => {
    clearWalletSession();
    setIsConnected(false);
    setWalletAddress('');
    setWalletAccount(null);
    setTokenBalance('0');
    setSelectedWallet(null);
    setView('landing');
  };

  // --- ACTIONS ---
  const handleConnect = async () => {
    if (!selectedWallet) return alert("Please select a Starknet wallet.");
    const normalizedInput = walletAddress.trim();

    setIsVerifyingWallet(true);
    try {
      const walletType = selectedWallet as WalletName;
      const browserWallets = window as Window & {
        starknet?: InjectedStarknetWallet;
        starknet_braavos?: InjectedStarknetWallet;
        starknet_argentX?: InjectedStarknetWallet;
      };
      const injectedWallet =
        walletType === 'Braavos'
          ? browserWallets.starknet_braavos
          : walletType === 'Argent X'
            ? browserWallets.starknet_argentX
            : browserWallets.starknet;

      if (!injectedWallet?.enable) {
        alert('Selected wallet extension was not detected in this browser.');
        return;
      }

      const accounts = await injectedWallet.enable();
      const selectedAddress = (
        injectedWallet.selectedAddress || injectedWallet.account?.address || accounts?.[0] || ''
      ).toLowerCase();

      const resolvedAddress = (normalizedInput || selectedAddress).trim();
      if (!/^0x[a-fA-F0-9]{1,64}$/.test(resolvedAddress)) {
        return alert("Please enter a valid wallet address starting with 0x, or unlock the selected wallet extension.");
      }
      if (normalizedInput && selectedAddress && selectedAddress !== normalizedInput.toLowerCase()) {
        alert('The entered wallet address does not match the selected wallet extension account.');
        return;
      }

      const walletChainId =
        (typeof injectedWallet.provider?.getChainId === 'function'
          ? await injectedWallet.provider.getChainId().catch(() => undefined)
          : injectedWallet.provider?.chainId) || '';
      const rpcChainId = await provider.getChainId().catch(() => '');
      if (walletChainId && rpcChainId && walletChainId !== rpcChainId) {
        alert(`Network mismatch. Wallet is on ${walletChainId}, app RPC is ${rpcChainId}. Switch wallet network and retry.`);
        return;
      }

      // Optional deployed-account verification via RPC.
      // If this RPC check is unavailable but wallet is injected correctly, allow connection.
      try {
        await provider.getClassHashAt(resolvedAddress);
      } catch {
        if (!selectedAddress || selectedAddress !== resolvedAddress.toLowerCase()) {
          alert('Wallet address is not an existing deployed Starknet wallet on this network.');
          return;
        }
      }

      if (!injectedWallet.account?.execute) {
        alert('Connected wallet account does not expose execute(). Please reconnect with Argent X or Braavos.');
        return;
      }
      setWalletAccount(injectedWallet.account);

      setWalletAddress(resolvedAddress);
      setIsConnected(true);
      setShowWalletModal(false);
      setView('dashboard');
      persistWalletSession(walletType, resolvedAddress);
      await loadOnchainProposals(resolvedAddress);
      await refreshTokenBalance(resolvedAddress);
    } catch {
      alert('Wallet connection failed. Ensure extension is unlocked and set to Starknet Sepolia.');
      return;
    } finally {
      setIsVerifyingWallet(false);
    }
  };

  const handleAdminAuth = () => {
    if (adminAuthInput === "ADMIN123") {
      setIsAdminAuthenticated(true);
      alert("Admin Access Verified.");
    } else {
      alert("Invalid Admin Key.");
    }
  };

  const handlePublishProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formTitle || !formSummary || !formDeadline) return alert("Please fill in all required fields.");
    if (!walletAccount?.execute) return alert("Connect a Starknet wallet first.");
    if (!privateVotingAddress) return alert("PrivateVoting contract address is missing in frontend env.");
    if (formTitle.length > 31) return alert("Proposal title must be 31 characters or fewer (felt252 short string).");

    const selectedDate = new Date(formDeadline);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (selectedDate < today) {
      return alert("Error: The voting deadline cannot be in the past.");
    }

    const deadlineTs = Math.floor(new Date(`${formDeadline}T23:59:59Z`).getTime() / 1000);
    setIsSubmittingTx(true);
    try {
      const tx = await walletAccount.execute({
        contractAddress: privateVotingAddress,
        entrypoint: 'create_proposal',
        calldata: CallData.compile({
          title: shortString.encodeShortString(formTitle),
          deadline: deadlineTs,
        }),
      });
      await waitForTx(tx);
      await loadOnchainProposals(walletAddress);
      setView('dashboard');
      setFormTitle('');
      setFormSummary('');
      setFormMotivation('');
      setFormDeadline('');
      alert('Proposal created on-chain.');
    } catch (error) {
      console.error(error);
      alert('Proposal creation failed. Ensure connected wallet is the contract admin and has gas.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleVote = async (type: 'for' | 'against') => {
    if (selectedProposal.hasVoted || selectedProposal.status !== 'Live') return;
    if (!isConnected) return alert("Connect wallet to vote.");
    if (!walletAccount?.execute) return alert("Connect a Starknet wallet first.");
    if (!privateVotingAddress) return alert("PrivateVoting contract address is missing in frontend env.");
    if (typeof selectedProposal.contractId !== 'number') return alert("Proposal is not loaded from on-chain data.");
    if (!/^\d+$/.test(daoVoteWeight) || daoVoteWeight === '0') {
      return alert('Enter a valid positive vote weight.');
    }
    if (!/^(0x[a-fA-F0-9]{1,64}|\d+)$/.test(daoVoteNullifier.trim())) {
      return alert('Enter a valid nullifier (decimal or 0x felt).');
    }
    const proofFelts = daoVoteProof
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (proofFelts.length === 0) {
      return alert('Enter at least one proof felt.');
    }

    setIsSubmittingTx(true);
    try {
      const tx = await walletAccount.execute({
        contractAddress: privateVotingAddress,
        entrypoint: 'vote_on_proposal',
        calldata: CallData.compile({
          proposal_id: selectedProposal.contractId,
          support: type === 'for',
          weight: daoVoteWeight,
          nullifier_hash: daoVoteNullifier.trim(),
          proof: proofFelts,
        }),
      });
      await waitForTx(tx);
      await loadOnchainProposals(walletAddress);
      await refreshTokenBalance(walletAddress);
      setDaoVoteProof('');
      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === selectedProposal.id ? { ...proposal, hasVoted: true } : proposal,
        ),
      );
      setSelectedProposal((prev) => ({ ...prev, hasVoted: true }));
      alert('Vote submitted on-chain.');
    } catch (error) {
      console.error(error);
      alert('Vote failed. Check proof validity, nullifier uniqueness, and proposal deadline.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleMintTokens = async () => {
    if (!isAdminAuthenticated) return alert('Admin auth required.');
    if (!walletAccount?.execute) return alert('Connect a Starknet wallet first.');
    if (!/^0x[a-fA-F0-9]{1,64}$/.test(mintRecipient.trim())) return alert('Enter a valid recipient wallet address.');
    if (!/^\d+$/.test(mintAmount) || mintAmount === '0') return alert('Enter a valid positive token amount.');

    const coinAddress = await resolveTokenAddress();
    if (!coinAddress) return alert('VV Coin address not found.');

    setIsSubmittingTx(true);
    try {
      const tx = await walletAccount.execute({
        contractAddress: coinAddress,
        entrypoint: 'mint',
        calldata: CallData.compile({
          to: mintRecipient.trim(),
          amount: mintAmount,
        }),
      });
      await waitForTx(tx);
      await refreshTokenBalance(walletAddress);
      setMintRecipient('');
      setMintAmount('');
      alert('VV Coin minted successfully.');
    } catch (error) {
      console.error(error);
      alert('Mint failed. Ensure connected wallet is VV Coin admin.');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  useEffect(() => {
    if (!privateVotingAddress) return;
    loadOnchainProposals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateVotingAddress]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(WALLET_SESSION_KEY);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as { walletType?: WalletName; walletAddress?: string };
        const walletType = parsed.walletType;
        const storedAddress = (parsed.walletAddress || '').trim();

        if (!walletType || !/^0x[a-fA-F0-9]{1,64}$/.test(storedAddress)) {
          clearWalletSession();
          return;
        }

        const browserWallets = window as Window & {
          starknet?: InjectedStarknetWallet;
          starknet_braavos?: InjectedStarknetWallet;
          starknet_argentX?: InjectedStarknetWallet;
        };

        const injectedWallet =
          walletType === 'Braavos'
            ? browserWallets.starknet_braavos
            : walletType === 'Argent X'
              ? browserWallets.starknet_argentX
              : browserWallets.starknet;

        if (!injectedWallet?.enable || !injectedWallet.account?.execute) {
          clearWalletSession();
          return;
        }

        const accounts = await injectedWallet.enable();
        const selectedAddress = (
          injectedWallet.selectedAddress || injectedWallet.account?.address || accounts?.[0] || ''
        ).toLowerCase();

        if (selectedAddress && selectedAddress !== storedAddress.toLowerCase()) {
          clearWalletSession();
          return;
        }

        if (cancelled) return;

        setSelectedWallet(walletType);
        setWalletAddress(storedAddress);
        setWalletAccount(injectedWallet.account);
        setIsConnected(true);
        setView('dashboard');
        await loadOnchainProposals(storedAddress);
        await refreshTokenBalance(storedAddress);
      } catch {
        clearWalletSession();
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnected || !walletAddress) return;
    loadOnchainProposals(walletAddress);
    refreshTokenBalance(walletAddress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, walletAddress]);

  
  return (
    <div className="min-h-screen bg-[#05070a] text-slate-400 font-sans flex flex-col overflow-x-hidden selection:bg-[#86e8f8] selection:text-black">
      
      {/* SIDEBAR */}
      <div className={`fixed inset-0 z-[250] bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-[85%] sm:w-[350px] bg-[#0d1117] p-6 flex flex-col transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center mb-12">
            <span className="text-white font-black uppercase text-xl">VoteVault</span>
            <CloseIcon className="cursor-pointer text-slate-500" onClick={() => setIsSidebarOpen(false)} />
          </div>

          <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-8 flex">
            <button onClick={() => setIsAdminMode(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isAdminMode ? 'bg-[#86e8f8] text-black' : 'text-slate-500'}`}>Voter</button>
            <button onClick={() => setIsAdminMode(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isAdminMode ? 'bg-amber-500 text-black' : 'text-slate-500'}`}>Admin</button>
          </div>
        
          

          {isAdminMode && (
            <div className="mb-8">
              {!isAdminAuthenticated ? (
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <input type="password" value={adminAuthInput} onChange={e=>setAdminAuthInput(e.target.value)} placeholder="Admin Key" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none" />
                  <button onClick={handleAdminAuth} className="w-full bg-amber-500 text-black py-3 rounded-xl font-black uppercase text-[10px]">Verify</button>
                </div>
              ) : (
                <button onClick={() => {setView('admin-create'); setIsSidebarOpen(false);}} className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Plus size={16}/> Create Proposal</button>
              )}
            </div>
          )}

          <nav className="space-y-2 flex-grow">
            <button onClick={() => {setView('dashboard'); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase transition-colors ${view === 'dashboard' ? 'bg-white/5 text-white' : 'hover:bg-white/5'}`}><LayoutDashboard size={18}/> Dashboard</button>
            <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase hover:bg-white/5"><Shield size={18}/> Audit Logs</button>
          </nav>
          <button onClick={() => {disconnectWallet(); setIsSidebarOpen(false);}} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase text-red-500 hover:bg-red-500/5 transition-colors"><LogOut size={18}/> Disconnect</button>
        </div>
      </div>

      {/* HEADER */}
      <header className="flex justify-between items-center px-4 md:px-12 py-6 border-b border-white/5 sticky top-0 bg-[#05070a]/90 backdrop-blur-xl z-[100]">
        <div className="flex items-center gap-3 md:gap-8">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white"><Menu size={24} /></button>
          <div onClick={() => setView('landing')} className="cursor-pointer font-black text-white text-lg md:text-xl uppercase tracking-tighter">VoteVault</div>
        </div>
        <div className="relative">
          {isConnected ? (
            <button onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)} className="flex items-center gap-2 md:gap-3 bg-[#0d1117] border border-white/10 px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-mono text-white">
              <span className="hidden xs:inline">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span><span className="xs:hidden">{`${walletAddress.slice(0, 4)}...`}</span> <ChevronDown size={14} />
            </button>
          ) : (
            <button onClick={() => setShowWalletModal(true)} className="bg-[#86e8f8] text-black px-5 md:px-8 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase">Connect</button>
          )}
          {isWalletDropdownOpen && (
            <div className="absolute right-0 mt-4 w-52 md:w-60 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl p-2 z-[300]">
              <button onClick={() => {navigator.clipboard.writeText(walletAddress); setIsWalletDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase text-slate-300"><Copy size={14}/> Copy Address</button>
              <button onClick={() => {disconnectWallet(); setIsWalletDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold uppercase"><LogOut size={14}/> Disconnect</button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-grow w-full">
        {view === 'landing' && (
          <div className="animate-in fade-in duration-700 w-full overflow-hidden">
            {/* --- RESTRUCTURED DOUBLE COLUMN HERO --- */}
            <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-32 pb-24 md:pb-40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left Side: Text */}
                <div className="text-left space-y-8 md:space-y-10 order-2 lg:order-1">
                  <h1 className="text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-black text-white leading-[1.05] tracking-tighter uppercase">
                    Vote with <span className="text-[#86e8f8]">Privacy</span>,<br/> Trust with <span className="text-[#86e8f8]">Proof</span>
                  </h1>
                  <p className="text-slate-500 text-sm md:text-x0.5 max-w-xl leading-relaxed">
                    Anonymous voting powered by cutting-edge zero-knowledge cryptography. Secure your DAO's future without compromising identity.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowWalletModal(true)} className="bg-[#86e8f8] text-black px-10 md:px-14 py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-[0.2em] hover:scale-105 transition-transform">Launch Governance</button>
                    <button className="bg-white/5 text-white border border-white/10 px-10 md:px-14 py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-[0.2em] hover:bg-white/10 transition-all">Read Whitepaper</button>
                  </div>
                </div>

                {/* Right Side: Visual Image/Graphic */}
                <div className="order-1 lg:order-2 relative group">
                  <div className="absolute -inset-4 bg-[#86e8f8]/10 rounded-[4rem] blur-3xl group-hover:bg-[#86e8f8]/20 transition-all duration-700" />
                  <div className="relative bg-[#0d1117] border border-white/10 rounded-[3rem] md:rounded-[4rem] aspect-square flex items-center justify-center overflow-hidden shadow-2xl">
                    {/* Stylized Cryptographic Illustration */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="absolute top-10 left-10 w-32 h-32 border border-[#86e8f8] rounded-full animate-pulse" />
                      <div className="absolute bottom-20 right-10 w-48 h-48 border border-[#86e8f8]/30 rounded-full" />
                    </div>
                    <div className="z-10 flex flex-col items-center gap-6">
                      <img src="/hero-img.png" alt="Governance Visual" className="w-full h-full object-contain p-4" />
                       <div className="px-6 py-2 bg-[#86e8f8]/10 border border-[#86e8f8]/20 rounded-full">
                         <span className="text-[#86e8f8] font-mono text-[10px] uppercase tracking-[0.3em]">ZK-Proof Verified</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="py-20 md:py-32 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 md:mb-24 space-y-4">
                  <h4 className="text-[#86e8f8] font-black uppercase text-[10px] tracking-[0.3em]">Protocol Flow</h4>
                  <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter">How It Works</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                  {[
                    { i: <UserCheck size={32}/>, t: "01. Authenticate", d: "Connect your wallet. We generate a unique ZK-Identity that proves your right without revealing your address." },
                    { i: <Fingerprint size={32}/>, t: "02. Cast Privately", d: "Your vote is wrapped in a cryptographic proof. It is valid, verified, and completely untraceable." },
                    { i: <CheckCircle2 size={32}/>, t: "03. Verify On-Chain", d: "Results are settled instantly on-chain. Anyone can verify the math, but no one can see who voted for what." }
                  ].map((step, i) => (
                    <div key={i} className="bg-[#0d1117] p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 space-y-6">
                      <div className="w-14 h-14 bg-[#86e8f8] text-black rounded-xl flex items-center justify-center">{step.i}</div>
                      <h3 className="text-white font-black uppercase text-lg md:text-xl tracking-tighter">{step.t}</h3>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{step.d}</p>
                    </div>
                  ))}
                </div>
            </section>

            {/* THREE CARDS */}
            <section className="py-10 md:py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {[{i: <ShieldCheck size={44}/>, t: "Identity Shield", d: "Your vote is verified on-chain without exposing your wallet address."},{i: <Globe size={44}/>, t: "ZK-Universal", d: "The standard for private decentralized decision making.", m: true},{i: <Zap size={44}/>, t: "Instant Finality", d: "Results are calculated instantly with cryptographic certainty."}].map((c, i) => (
                <div key={i} className={`bg-[#0d1117] rounded-[2.5rem] md:rounded-[3.5rem] border ${c.m ? 'border-[#86e8f8]/40 md:-translate-y-12 shadow-2xl' : 'border-white/5'} p-10 md:p-12 text-center space-y-6 md:space-y-8 flex flex-col items-center justify-center`}>
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-[#86e8f8]/5 rounded-full flex items-center justify-center text-[#86e8f8]">{c.i}</div>
                  <h3 className="text-white font-black uppercase text-xl md:text-2xl tracking-tighter">{c.t}</h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{c.d}</p>
                </div>
              ))}
            </section>

            {/* GRID FEATURES */}
            <section className="py-24 md:py-40 px-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-[2.5rem] md:rounded-[4rem] overflow-hidden">
                {[
                  { i: <EyeOff/>, t: "Privacy First", d: "No link between identity and choice." },
                  { i: <Lock/>, t: "Immutable", d: "Cannot be altered by any entity." },
                  { i: <Zap/>, t: "Low Gas", d: "Optimized for minimal costs." },
                  { i: <Database/>, t: "Audit Ready", d: "Full history available for audit." },
                  { i: <ShieldCheck/>, t: "Sybil Guard", d: "Built-in protection against fake votes." },
                  { i: <Share2/>, t: "Multi-Chain", d: "Deploy across any EVM network." }
                ].map((f, i) => (
                  <div key={i} className="bg-[#05070a] p-10 md:p-16 hover:bg-white/[0.02]">
                    <div className="text-[#86e8f8] mb-6 md:mb-8">{f.i}</div>
                    <h4 className="text-white font-black text-[10px] md:text-xs uppercase mb-4 tracking-widest">{f.t}</h4>
                    <p className="text-slate-500 text-[10px] md:text-[11px] leading-relaxed font-medium">{f.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* MEET THE TEAM */}
            <section id="team" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
              <h2 className={`text-3xl md:text-5xl font-black uppercase mb-16 text-center ${theme === 'dark' ? 'text-white' : 'text-black'}`}>The Architects</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {team.map(member => (
                  <div key={member.name} className={`p-10 rounded-[3.5rem] border text-center transition-all hover:-translate-y-2 ${theme === 'dark' ? 'bg-[#0d1117] border-white/5' : 'bg-white border-black/5 shadow-xl'}`}>
                    <img src={member.img} alt={member.name} className="w-45 h-45 rounded-full mb-6 mx-auto border-4 border-[#86e8f8] p-1" />
                    <h3 className="font-black uppercase text-xl mb-1">{member.name}</h3>
                    <p className="text-[10px] font-black uppercase text-[#86e8f8] tracking-[0.2em]">{member.role}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="py-24 md:py-40 bg-black px-6 text-center border-y border-white/5">
                <div className="max-w-4xl mx-auto space-y-10 md:space-y-12">
                  <p className="text-lg md:text-4xl font-bold text-white italic">"{testimonials[activeTestimonial].quote}"</p>
                  <div className="flex justify-center gap-3">
                    {[0,1,2].map(i => <button key={i} onClick={()=>setActiveTestimonial(i)} className={`h-1 md:h-1.5 transition-all rounded-full ${activeTestimonial === i ? 'w-10 md:w-12 bg-[#86e8f8]' : 'w-2 md:w-3 bg-white/10'}`} />)}
                  </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section id="faq" className="py-24 px-6 max-w-3xl mx-auto border-t border-white/5">
              <h2 className={`text-3xl md:text-5xl font-black uppercase mb-16 text-center ${theme === 'dark' ? 'text-white' : 'text-black'}`}>General FAQ</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className={`rounded-[2rem] border overflow-hidden transition-all ${theme === 'dark' ? 'bg-[#0d1117] border-white/5' : 'bg-white border-black/5'}`}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-8 flex justify-between items-center text-left font-black uppercase text-[11px] tracking-widest">
                      {faq.q} <ChevronDown className={`transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} size={16} />
                    </button>
                    {openFaq === i && <div className="p-8 pt-0 text-sm opacity-60 leading-relaxed border-t border-white/5 animate-in slide-in-from-top-2">{faq.a}</div>}
                  </div>
                ))}
              </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-20 md:py-32 px-6 max-w-7xl mx-auto">
                <div className="bg-[#0d1117] rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-24 border border-[#86e8f8]/20 flex flex-col items-center text-center">
                    <h2 className="text-3xl md:text-7xl font-black text-white uppercase mb-8 md:mb-10 leading-tight md:leading-none">Ready to Vote <br/><span className="text-[#86e8f8]">Without Borders?</span></h2>
                    <button onClick={() => setShowWalletModal(true)} className="w-full sm:w-auto bg-[#86e8f8] text-black px-10 md:px-14 py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest">Get Started</button>
                </div>
            </section>
          </div>
        )}
        

        {view === 'dashboard' && (
          <div className="p-4 md:p-16 max-w-7xl mx-auto w-full animate-in fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 md:gap-8 mb-12 md:mb-20">
              <div className="flex bg-[#0d1117] p-1 md:p-1.5 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 w-full lg:w-auto overflow-x-auto no-scrollbar">
                {['All', 'Live', 'Passed', 'Pending', 'Rejected'].map(f => (
                  <button key={f} onClick={()=>setActiveFilter(f)} className={`px-4 md:px-8 py-2.5 md:py-3 rounded-[1.2rem] md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${activeFilter === f ? 'bg-[#86e8f8] text-black' : 'text-slate-500'}`}>{f}</button>
                ))}
              </div>
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} type="text" placeholder="Search proposals..." className="w-full bg-[#0d1117] border border-white/10 rounded-2xl py-4 md:py-5 pl-14 md:pl-16 pr-8 text-xs md:text-sm text-white outline-none focus:border-[#86e8f8]/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              {filteredProposals.map(p => {
                const { forP } = getPercentages(p.forVotes, p.againstVotes);
                return (
                  <div key={p.id} onClick={() => { setSelectedProposal(p); setView('proposal-detail'); }} className="bg-[#0d1117] p-8 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border border-white/5 hover:border-[#86e8f8]/30 cursor-pointer flex flex-col h-full">
                    <div className="flex justify-between items-center mb-8">
                      <span className={`px-3 py-1 border rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest ${getTagStyle(p.status)}`}>{p.status}</span>
                      <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-600 tracking-widest">{p.tag}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-6 uppercase leading-tight line-clamp-2">{p.title}</h3>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-[8px] md:text-[10px] font-black uppercase text-slate-500">
                        <span className="text-green-500">For: {Math.round(forP)}%</span>
                        <span className="text-red-500">Against: {Math.round(100 - forP)}%</span>
                      </div>
                      <div className="h-1.5 md:h-2 w-full bg-red-500/20 rounded-full overflow-hidden flex">
                        <div style={{ width: `${forP}%` }} className="h-full bg-green-500" />
                      </div>
                    </div>
                    <div className="mt-auto pt-6 border-t border-white/5 text-[9px] md:text-[10px] font-black uppercase text-slate-500 flex justify-between items-center">
                      View Details <ChevronRight size={16}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'admin-create' && (
          <div className="p-6 md:p-16 max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-8">
             <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase mb-10"><ChevronLeft size={18}/> Cancel</button>
             <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-10">New Proposal</h2>
             
             <form onSubmit={handlePublishProposal} className="space-y-6 md:space-y-8 bg-[#0d1117] p-8 md:p-14 rounded-[2rem] md:rounded-[3.5rem] border border-white/10 shadow-2xl">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Title</label>
                  <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} type="text" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 text-white outline-none focus:border-[#86e8f8]/50" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</label>
                    <select value={formTag} onChange={e=>setFormTag(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 text-white outline-none appearance-none">
                      <option value="Technical">Technical</option>
                      <option value="Treasury">Treasury</option>
                      <option value="Community">Community</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Deadline</label>
                    <input value={formDeadline} onChange={e=>setFormDeadline(e.target.value)} type="date" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 text-white outline-none" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Summary</label>
                  <textarea value={formSummary} onChange={e=>setFormSummary(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 text-white outline-none resize-none" required />
                </div>
                <button type="submit" disabled={isSubmittingTx} className={`w-full py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-3 ${isSubmittingTx ? 'bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-[#86e8f8] text-black'}`}>{isSubmittingTx ? 'Publishing...' : 'Publish Proposal'}</button>
             </form>

             <div className="mt-8 space-y-4 bg-[#0d1117] p-8 md:p-10 rounded-[2rem] border border-white/10">
               <h3 className="text-white font-black uppercase text-sm tracking-widest">Mint VV Coin</h3>
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Admin Distribution</p>
               <input value={mintRecipient} onChange={e => setMintRecipient(e.target.value)} type="text" placeholder="Recipient wallet address" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
               <input value={mintAmount} onChange={e => setMintAmount(e.target.value)} type="number" min="1" placeholder="Amount" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
               <button type="button" onClick={handleMintTokens} disabled={isSubmittingTx} className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest ${isSubmittingTx ? 'bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-black'}`}>{isSubmittingTx ? 'Processing...' : 'Mint Tokens'}</button>
             </div>
          </div>
        )}

       {view === 'proposal-detail' && (
          <div className="p-6 md:p-16 max-w-7xl mx-auto animate-in slide-in-from-right-8 duration-500">
             {/* TOP NAVIGATION */}
             <div className="flex justify-between items-center mb-12">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 opacity-50 font-black uppercase text-[10px] hover:opacity-100 transition-opacity">
                   <ChevronLeft size={16}/> Back
                </button>
                <div className={`px-4 py-2 rounded-xl border text-[10px] font-mono ${theme === 'dark' ? 'bg-[#0d1117] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                   {isConnected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                </div>
             </div>

             <div className="grid lg:grid-cols-3 gap-8">
               {/* LEFT COLUMN: FULL DESCRIPTION & DISCUSSION */}
               <div className="lg:col-span-2 space-y-8">
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 border rounded-lg text-[8px] font-black uppercase tracking-widest ${selectedProposal.status === 'Live' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                          {selectedProposal.status}
                        </span>
                        <span className="text-[10px] font-bold opacity-40 uppercase">Ends {selectedProposal.deadline}</span>
                     </div>
                     <h2 className={`text-3xl md:text-4xl font-black uppercase leading-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{selectedProposal.title}</h2>
                     <p className="text-sm opacity-50 leading-relaxed max-w-2xl">Proposal to adjust protocol parameters to ensure long-term network stability and security.</p>
                  </div>

                  <div className={`p-10 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#0d1117] border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                    <h3 className="font-black uppercase text-xl mb-8">Full Description</h3>
                    <div className="space-y-8">
                      <div>
                        <h4 className="font-black uppercase text-[11px] mb-4 text-[#86e8f8]">Summary</h4>
                        <p className="text-sm opacity-70 leading-relaxed">{selectedProposal.summary}</p>
                      </div>
                      <div>
                        <h4 className="font-black uppercase text-[11px] mb-4 text-[#86e8f8]">Motivation</h4>
                        <p className="text-sm opacity-70 leading-relaxed">{selectedProposal.motivation || "This proposal addresses the current needs for protocol scalability and user incentives."}</p>
                      </div>
                      <div>
                        <h4 className="font-black uppercase text-[11px] mb-4 text-[#86e8f8]">Specification</h4>
                        <ul className="text-sm opacity-70 space-y-2 list-disc pl-5">
                          <li>Category: {selectedProposal.tag}</li>
                          <li>Current Status: {selectedProposal.status}</li>
                          <li>Quorum Required: {selectedProposal.quorum}%</li>
                          <li>Verification: Zero-Knowledge Proof (STARK)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* DISCUSSION SECTION (FUNCTIONAL) */}
                  <div className={`p-10 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#0d1117] border-white/5' : 'bg-white border-black/5'}`}>
                    <h3 className="font-black uppercase text-[11px] mb-6 opacity-40">Discussion</h3>
                    <div className="space-y-6">
                      <textarea 
                        value={adminAuthInput} 
                        onChange={(e) => setAdminAuthInput(e.target.value)} 
                        placeholder="Leave a comment..." 
                        className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 text-sm outline-none h-32 text-white resize-none" 
                      />
                      <button 
                        onClick={() => {
                          if(!adminAuthInput.trim()) return;
                          // In a real app, you'd push to a state array. For this demo, we alert and clear.
                          alert("Comment posted: " + adminAuthInput);
                          setAdminAuthInput('');
                        }}
                        className="bg-[#86e8f8] text-black px-8 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <Send size={14}/> Post Comment
                      </button>

                      <div className="pt-8 space-y-6">
                        {/* Newest comment placeholder logic */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-[#86e8f8]">0x7a3f...6f7a</span>
                            <span className="text-[9px] opacity-30">Just now</span>
                          </div>
                          <p className="text-xs opacity-60">I've reviewed the ZK-proof logic for this proposal. It looks solid and significantly improves privacy.</p>
                        </div>
                        {/* Static existing comments */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-[#86e8f8]">0x4b2d...1e8c</span>
                            <span className="text-[9px] opacity-30">2 hours ago</span>
                          </div>
                          <p className="text-xs opacity-60">Strong support for this. Validator attrition is a real concern and this adjustment is necessary.</p>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* RIGHT COLUMN: VOTING & STATS */}
               <div className="space-y-6">
                  {/* CAST VOTE CARD (RESTRICTED TO LIVE) */}
                  <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#0d1117] border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
                    <h4 className="font-black uppercase text-[10px] mb-8 opacity-40 text-center">Cast Your Vote</h4>
                    
                    {selectedProposal.status !== 'Live' ? (
                      <div className="py-6 border-2 border-white/5 rounded-2xl text-slate-500 font-black uppercase text-[10px] flex flex-col items-center gap-2 bg-white/5 text-center px-4">
                        <Ban size={24} className="opacity-30"/> Voting is {selectedProposal.status}
                      </div>
                    ) : !selectedProposal.hasVoted ? (
                      <div className="space-y-3">
                        <input
                          type="number"
                          min="1"
                          value={daoVoteWeight}
                          onChange={(e) => setDaoVoteWeight(e.target.value)}
                          placeholder="Private vote weight"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none text-xs"
                        />
                        <input
                          type="text"
                          value={daoVoteNullifier}
                          onChange={(e) => setDaoVoteNullifier(e.target.value)}
                          placeholder="Nullifier (0x... or decimal)"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none text-xs font-mono"
                        />
                        <textarea
                          value={daoVoteProof}
                          onChange={(e) => setDaoVoteProof(e.target.value)}
                          placeholder="Proof felts (comma separated)"
                          rows={3}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none text-xs font-mono resize-none"
                        />
                        <button disabled={isSubmittingTx || !isConnected} onClick={() => handleVote('for')} className={`w-full py-4 rounded-xl font-black uppercase text-[10px] transition-transform ${isSubmittingTx || !isConnected ? 'bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-[#86e8f8] text-black hover:scale-[1.02]'}`}>{isSubmittingTx ? 'Submitting...' : 'Vote For'}</button>
                        <button disabled={isSubmittingTx || !isConnected} onClick={() => handleVote('against')} className={`w-full py-4 rounded-xl font-black uppercase text-[10px] border ${isSubmittingTx || !isConnected ? 'bg-white/10 text-slate-500 cursor-not-allowed border-white/10' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>Vote Against</button>
                      </div>
                    ) : (
                      <div className="py-6 border-2 border-green-500/20 rounded-2xl text-green-500 font-black uppercase text-[10px] flex flex-col items-center gap-2 bg-green-500/5">
                        <CheckCircle2 size={24}/> Vote Submitted
                      </div>
                    )}
                    <p className="text-center text-[9px] font-black uppercase text-[#86e8f8] mt-4 tracking-[0.2em]">Voting Power: {tokenBalance} VV</p>
                    <p className="text-center text-[8px] font-bold uppercase opacity-30 mt-6 tracking-widest">
                      {selectedProposal.status === 'Live' ? (isConnected ? 'Wallet connected can vote' : 'Connect wallet to vote') : 'This proposal is no longer active'}
                    </p>
                  </div>

                  {/* VOTE DISTRIBUTION (DYNAMIC DONUT) */}
                  <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#0d1117] border-white/10' : 'bg-white border-black/10'}`}>
                    <h4 className="font-black uppercase text-[10px] mb-8 opacity-40 text-center">Vote Distribution</h4>
                    <div className="relative flex justify-center py-4">
                        <div 
                          className="w-40 h-40 rounded-full flex items-center justify-center transition-all duration-1000" 
                          style={{ 
                            background: `conic-gradient(#22c55e 0% ${getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).forP}%, #ef4444 ${getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).forP}% 100%)` 
                          }}
                        >
                           <div className={`w-28 h-28 rounded-full ${theme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'}`} />
                        </div>
                    </div>
                    <div className="flex justify-center gap-8 mt-6">
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 bg-green-500 rounded-sm"/> For</div>
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 bg-red-500 rounded-sm"/> Against</div>
                    </div>
                  </div>

                  {/* STATISTICS (LIVE UPDATE) */}
                  <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-[#0d1117] border-white/10' : 'bg-white border-black/10'}`}>
                    <h4 className="font-black uppercase text-[10px] mb-8 opacity-40 text-center">Statistics</h4>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center"><span className="text-[11px] font-bold opacity-50 uppercase">Total Votes</span><span className="text-sm font-black">{(selectedProposal.forVotes + selectedProposal.againstVotes).toLocaleString()}</span></div>
                       <div className="flex justify-between items-center"><span className="text-[11px] font-bold opacity-50 uppercase">Unique Voters</span><span className="text-sm font-black">{selectedProposal.voters}</span></div>
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold opacity-50 uppercase">For</span>
                          <span className="text-sm font-black text-green-500">{getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).forP.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold opacity-50 uppercase">Against</span>
                          <span className="text-sm font-black text-red-500">{getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).againstP.toFixed(1)}%</span>
                       </div>
                       <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex justify-between text-[10px] font-black uppercase"><span>Quorum Progress</span><span>{selectedProposal.quorum}%</span></div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${selectedProposal.quorum}%` }} />
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
             </div>
          </div>
        )}
      {/* FOOTER */}
      <footer className="bg-[#080a0f] pt-20 md:pt-32 pb-12 md:pb-16 px-6 md:px-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-16 mb-16 md:mb-24">
              <div className="sm:col-span-2 lg:col-span-2 space-y-6 md:space-y-8">
                <div className="text-white font-black uppercase text-2xl md:text-3xl tracking-tighter">VoteVault</div>
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-sm">
                  The standard for private decentralized decision making using zero-knowledge technology.
                </p>
                <div className="flex gap-4">
                  {[ MessageSquare].map((Icon, i) => (
                    <a key={i} href="#" className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Protocol</h4>
                <ul className="space-y-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <li>Documentation</li><li>ZK-Proofs Lab</li><li>SDK</li><li>Security</li>
                </ul>
              </div>

              <div className="space-y-6">
                <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Ecosystem</h4>
                <ul className="space-y-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <li>Grants</li><li>Ambassadors</li><li>Partner DAOs</li>
                </ul>
              </div>

              <div className="space-y-6 sm:col-span-2 lg:col-span-1">
                <h4 className="text-white font-black text-[10px] uppercase tracking-widest">Newsletter</h4>
                <div className="relative">
                  <input type="email" placeholder="Email" className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-5 text-xs text-white outline-none" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#86e8f8] text-black p-1.5 rounded-lg"><ArrowUpRight size={14} /></button>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-wrap justify-center gap-6 text-[8px] md:text-[9px] font-black uppercase text-slate-600 tracking-widest">
                <span>Privacy Policy</span><span>Terms</span><span>v1.0.4-Beta</span>
              </div>
              <div className="text-[8px] md:text-[10px] font-black uppercase text-slate-800 tracking-[0.3em] text-center md:text-right">
                &copy; 2026 VoteVault Protocol Labs.
              </div>
            </div>
          </div>
      </footer>
      </main>
      

      {showWalletModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          {/* Backdrop with heavy blur as per your code */}
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => {setShowWalletModal(false); setSelectedWallet(null); setWalletAddress('');}} />
          
          <div className="relative bg-[#0d1117] border border-white/10 w-full max-w-md rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-14 animate-in zoom-in-95 duration-300">
            
            {!selectedWallet ? (
              /* STAGE 1: SELECT WALLET (With Logos) */
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-10 text-center italic">Connect Identity</h3>
                
                <div className="grid gap-4">
                  {CONNECT_WALLETS.map(w => (
                    <button 
                      key={w.name} 
                      onClick={() => setSelectedWallet(w.name)} 
                      className="flex items-center justify-between p-5 rounded-[2rem] border border-white/5 bg-white/5 hover:border-[#86e8f8]/50 hover:bg-[#86e8f8]/5 transition-all group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-black/40 rounded-2xl p-2.5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <img src={w.logo} alt={w.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                          <span className="block text-white font-black uppercase text-[11px] tracking-widest">{w.name}</span>
                          <span className="block text-slate-500 text-[9px] uppercase font-bold mt-1">{w.desc}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-white opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* STAGE 2: WALLET ADDRESS INPUT */
              <div className="animate-in slide-in-from-right-4">
                 <div className="flex items-center gap-4 mb-10">
                    <button onClick={() => {setSelectedWallet(null); setWalletAddress('');}} className="p-2 hover:bg-white/5 rounded-full text-white transition-colors">
                      <ChevronLeft size={24}/>
                    </button>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Authorize</h3>
                      <p className="text-[10px] font-bold text-[#86e8f8] uppercase tracking-widest">Confirm {selectedWallet} Wallet</p>
                    </div>
                 </div>
                 <div className="space-y-10">
                    <input
                      type="text"
                      autoFocus
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 text-white text-sm outline-none focus:border-[#86e8f8]/50 font-mono"
                    />
                    <div className="text-center space-y-4">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Enter wallet address to connect</p>
                      <button
                        onClick={handleConnect}
                        disabled={isVerifyingWallet || !/^0x[a-fA-F0-9]{1,64}$/.test(walletAddress.trim())}
                        className={`w-full py-6 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${!isVerifyingWallet && /^0x[a-fA-F0-9]{1,64}$/.test(walletAddress.trim()) ? 'bg-[#86e8f8] text-black scale-105 shadow-lg shadow-[#86e8f8]/20' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
                      >
                        {isVerifyingWallet ? 'Verifying Wallet...' : 'Confirm Access'}
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
  )}
    </div>
  );
}
