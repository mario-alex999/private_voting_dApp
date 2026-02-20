// 
"use client";
import React, { useState, useMemo } from 'react';
import { 
  Lock, LayoutDashboard, Menu, X as CloseIcon,
  Shield,MessageSquare, 
  FileText, LogOut, Search, ChevronRight, 
  ChevronLeft, Copy, ChevronDown, CheckCircle2,
  Plus, ShieldCheck, Zap, Globe, Database, Share2, EyeOff, Clock, Ban, Shield, Calendar, Send, Mail, ArrowUpRight, Fingerprint, UserCheck
} from 'lucide-react';

export default function VoteVault() {
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

  // --- WALLET & AUTH STATE ---
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletPassword, setWalletPassword] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [adminAuthInput, setAdminAuthInput] = useState('');

  // --- PROPOSALS DATA STATE ---
  const [proposals, setProposals] = useState([
    { 
      id: 1, title: "Increase Validator Rewards by 15%", 
      summary: "Adjusting validator staking rewards to ensure network liveness.",
      motivation: "Validator count has dropped by 12% over the last quarter.",
      deadline: "2026-03-15", status: "Live", forVotes: 15650, againstVotes: 4200, voters: 847, hasVoted: false, tag: "Technical", quorum: 42
    },
    { 
      id: 2, title: "Strategic Treasury Diversification", 
      summary: "Moving protocol reserves into stETH for better yield.", 
      deadline: "2026-02-28", status: "Pending", forVotes: 0, againstVotes: 0, voters: 0, hasVoted: false, tag: "Treasury", quorum: 15 
    },
    { 
      id: 3, title: "Global Ambassador Program", 
      summary: "Marketing budget for regional adoption leads.", 
      deadline: "2026-01-10", status: "Passed", forVotes: 25000, againstVotes: 1200, voters: 1100, hasVoted: false, tag: "Community", quorum: 65 
    }
  ]);

  const [selectedProposal, setSelectedProposal] = useState(proposals[0]);

  // --- NEW PROPOSAL FORM STATE ---
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formMotivation, setFormMotivation] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formTag, setFormTag] = useState('Technical');

  // --- LOGIC & HELPERS ---
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

  // --- ACTIONS ---
  const handleConnect = () => {
    if (walletPassword.length < 4) return alert("Security Notice: Please enter your 4-digit wallet pin.");
    setIsConnected(true);
    setShowWalletModal(false);
    setView('dashboard');
  };

  const handleAdminAuth = () => {
    if (adminAuthInput === "ADMIN123") {
      setIsAdminAuthenticated(true);
      alert("Admin Access Verified.");
    } else {
      alert("Invalid Admin Key.");
    }
  };

  const handlePublishProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formTitle || !formSummary || !formDeadline) return alert("Please fill in all required fields.");
    
    const selectedDate = new Date(formDeadline);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (selectedDate < today) {
      return alert("Error: The voting deadline cannot be in the past.");
    }
    
    const newP = {
      id: proposals.length + 1,
      title: formTitle,
      summary: formSummary,
      motivation: formMotivation,
      deadline: formDeadline,
      status: "Pending",
      forVotes: 0, againstVotes: 0, voters: 0, hasVoted: false, tag: formTag, quorum: 0
    };
    
    setProposals([newP, ...proposals]);
    setView('dashboard');
    setFormTitle(''); setFormSummary(''); setFormMotivation(''); setFormDeadline('');
  };

  const handleVote = (type: 'for' | 'against') => {
    if (selectedProposal.hasVoted || selectedProposal.status !== 'Live') return;
    const updated = proposals.map(p => {
      if (p.id === selectedProposal.id) {
        return { 
          ...p, 
          forVotes: type === 'for' ? p.forVotes + 1000 : p.forVotes, 
          againstVotes: type === 'against' ? p.againstVotes + 1000 : p.againstVotes, 
          voters: p.voters + 1, hasVoted: true 
        };
      }
      return p;
    });
    setProposals(updated);
    const updatedP = updated.find(p => p.id === selectedProposal.id);
    if(updatedP) setSelectedProposal(updatedP);
  };

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
          <button onClick={() => {setIsConnected(false); setView('landing'); setIsSidebarOpen(false);}} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase text-red-500 hover:bg-red-500/5 transition-colors"><LogOut size={18}/> Disconnect</button>
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
              <span className="hidden xs:inline">0x7a3f...6f7a</span><span className="xs:hidden">0x7a...</span> <ChevronDown size={14} />
            </button>
          ) : (
            <button onClick={() => setShowWalletModal(true)} className="bg-[#86e8f8] text-black px-5 md:px-8 py-2.5 md:py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase">Connect</button>
          )}
          {isWalletDropdownOpen && (
            <div className="absolute right-0 mt-4 w-52 md:w-60 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl p-2 z-[300]">
              <button onClick={() => {navigator.clipboard.writeText("0x7a3f...6f7a"); setIsWalletDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase text-slate-300"><Copy size={14}/> Copy Address</button>
              <button onClick={() => {setIsConnected(false); setView('landing'); setIsWalletDropdownOpen(false);}} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold uppercase"><LogOut size={14}/> Disconnect</button>
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
                  <p className="text-slate-500 text-sm md:text-xl max-w-xl leading-relaxed">
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

            {/* TESTIMONIALS */}
            <section className="py-24 md:py-40 bg-black px-6 text-center border-y border-white/5">
                <div className="max-w-4xl mx-auto space-y-10 md:space-y-12">
                  <p className="text-lg md:text-4xl font-bold text-white italic">"{testimonials[activeTestimonial].quote}"</p>
                  <div className="flex justify-center gap-3">
                    {[0,1,2].map(i => <button key={i} onClick={()=>setActiveTestimonial(i)} className={`h-1 md:h-1.5 transition-all rounded-full ${activeTestimonial === i ? 'w-10 md:w-12 bg-[#86e8f8]' : 'w-2 md:w-3 bg-white/10'}`} />)}
                  </div>
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
                <button type="submit" className="w-full bg-[#86e8f8] text-black py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center justify-center gap-3">Publish Proposal</button>
             </form>
          </div>
        )}

        {view === 'proposal-detail' && (
          <div className="p-4 md:p-16 max-w-7xl mx-auto w-full animate-in slide-in-from-right-10 overflow-hidden">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase mb-8 md:mb-16"><ChevronLeft size={20}/> Back</button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">
              <div className="lg:col-span-7 space-y-10 md:space-y-16">
                <div className="space-y-6 md:space-y-8">
                  <span className={`px-4 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest ${getTagStyle(selectedProposal.status)}`}>{selectedProposal.status}</span>
                  <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight">{selectedProposal.title}</h2>
                  <p className="text-slate-500 text-sm md:text-lg leading-relaxed">{selectedProposal.summary}</p>
                </div>
                <div className="bg-[#0d1117] p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-white/5 space-y-8">
                   <div className="space-y-4">
                      <h4 className="text-[#86e8f8] font-black uppercase text-[10px] tracking-widest">Motivation</h4>
                      <p className="text-slate-400 text-sm md:text-base leading-relaxed">{selectedProposal.motivation || "No additional details provided."}</p>
                   </div>
                   <div className="flex items-center gap-3 md:gap-4 text-slate-500 text-[10px] font-black uppercase bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 w-fit">
                      <Calendar size={18} className="text-[#86e8f8]"/> {selectedProposal.deadline}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8 md:space-y-10">
                <div className="bg-[#0d1117] p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-white/10 shadow-2xl text-center">
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-10">Cast Your Ballot</h4>
                  {selectedProposal.status === 'Live' && !selectedProposal.hasVoted && (
                    <div className="space-y-4">
                      <button onClick={() => handleVote('for')} className="w-full bg-[#86e8f8] text-black py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest">Support</button>
                      <button onClick={() => handleVote('against')} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest">Reject</button>
                    </div>
                  )}
                  {selectedProposal.status !== 'Live' && <p className="text-slate-600 font-black uppercase text-[10px]">Voting Closed</p>}
                  {selectedProposal.hasVoted && (
                    <div className="space-y-4">
                      <CheckCircle2 size={40} className="mx-auto text-green-500" />
                      <p className="text-green-500 font-black uppercase text-[10px]">Ballot Verified</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#0d1117] p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-white/5 text-center">
                  <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-10">Results</h4>
                  <div className="relative w-40 h-40 md:w-56 md:h-56 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#ef4444" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#22c55e" strokeWidth="4" 
                              strokeDasharray={`${getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).forP} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-black text-2xl md:text-4xl">{Math.round(getPercentages(selectedProposal.forVotes, selectedProposal.againstVotes).forP)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
                  {[Twitter, Github, MessageSquare].map((Icon, i) => (
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

      {/* WALLET MODAL */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowWalletModal(false)} />
          <div className="relative bg-[#0d1117] border border-white/10 w-full max-w-lg rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 animate-in zoom-in-95">
            <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-8 md:mb-10 text-center">Unlock Wallet</h3>
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {['MetaMask', 'Phantom'].map(w => (
                  <button key={w} onClick={() => setSelectedWallet(w)} className={`p-5 md:p-6 rounded-2xl border text-[9px] md:text-[10px] font-black uppercase transition-all ${selectedWallet === w ? 'bg-[#86e8f8] text-black border-[#86e8f8]' : 'bg-white/5 text-slate-500 border-white/5'}`}>{w}</button>
                ))}
              </div>
              <input type="password" value={walletPassword} onChange={e => setWalletPassword(e.target.value)} placeholder="Enter Pin" className="w-full bg-black/50 border border-white/10 rounded-xl py-4 md:py-6 px-6 md:px-8 text-sm text-white outline-none focus:border-[#86e8f8]/40" />
              <button onClick={handleConnect} className="w-full bg-[#86e8f8] text-black py-5 md:py-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest mt-4">Confirm Connection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
