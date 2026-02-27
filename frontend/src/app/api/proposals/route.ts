import { NextResponse } from 'next/server';
import { CallData, RpcProvider, shortString } from 'starknet';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cleanEnv = (value?: string) =>
  (value || '')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
const normalizeRpcUrl = (value?: string) => {
  let out = cleanEnv(value);
  if (out.startsWith('ttps://')) out = `h${out}`;
  if (out.startsWith('http//')) out = out.replace('http//', 'http://');
  if (out.startsWith('https//')) out = out.replace('https//', 'https://');
  if (!/^https?:\/\//i.test(out) && out.includes('starknet-sepolia.g.alchemy.com')) {
    out = `https://${out}`;
  }
  return out;
};
const isLikelyRpcUrl = (value: string) => /^https?:\/\/.+/i.test(value);
const DEFAULT_SEPOLIA_RPC = 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/demo';
const buildRpcCandidates = (...values: Array<string | undefined>) => {
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeRpcUrl(value);
    if (!isLikelyRpcUrl(normalized)) continue;
    out.push(normalized);
    if (normalized.includes('/rpc/v0_10/')) out.push(normalized.replace('/rpc/v0_10/', '/rpc/v0_8/'));
    if (normalized.endsWith('/rpc/v0_10')) out.push(normalized.replace('/rpc/v0_10', '/rpc/v0_8'));
  }
  return Array.from(new Set(out));
};

const toResult = (response: unknown): string[] => {
  if (Array.isArray(response)) return response.map(String);
  if (
    response &&
    typeof response === 'object' &&
    'result' in response &&
    Array.isArray((response as { result: unknown[] }).result)
  ) {
    return (response as { result: unknown[] }).result.map(String);
  }
  return [];
};

const toBigInt = (value: unknown): bigint => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'boolean') return value ? BigInt(1) : BigInt(0);
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return BigInt(0);
    return BigInt(trimmed);
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if ('low' in rec && 'high' in rec) {
      const low = toBigInt(rec.low);
      const high = toBigInt(rec.high);
      return (high << BigInt(128)) + low;
    }
  }
  return BigInt(0);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedContract = cleanEnv(searchParams.get('contractAddress') || '');
    const requestedRpcUrl = normalizeRpcUrl(searchParams.get('rpcUrl') || '');
    const contractAddress =
      requestedContract ||
      cleanEnv(process.env.NEXT_PUBLIC_PRIVATE_VOTING_ADDRESS) ||
      cleanEnv(process.env.CONTRACTS_PRIVATE_VOTING_ADDRESS);
    const rpcCandidates = buildRpcCandidates(
      requestedRpcUrl,
      process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
      process.env.RPC_URL_SEPOLIA,
      DEFAULT_SEPOLIA_RPC,
    );

    if (!contractAddress || rpcCandidates.length === 0) {
      return NextResponse.json({ proposals: [] }, { status: 200 });
    }

    let provider: RpcProvider | null = null;
    let lastRpcError: unknown = null;
    for (const rpcUrl of rpcCandidates) {
      try {
        const candidate = new RpcProvider({ nodeUrl: rpcUrl });
        await candidate.getChainId();
        provider = candidate;
        break;
      } catch (error) {
        lastRpcError = error;
      }
    }
    if (!provider) throw lastRpcError || new Error('No healthy RPC endpoint available.');

    const countResponse = await provider.callContract({
      contractAddress,
      entrypoint: 'get_proposal_count',
      calldata: [],
    }, 'latest');
    const count = Number(toBigInt(toResult(countResponse)[0] || 0));

    const proposals: Array<{
      id: number;
      contractId: number;
      title: string;
      deadlineTs: number;
      isOpen: boolean;
      forVotes: number;
      againstVotes: number;
    }> = [];

    for (let i = 0; i < count; i += 1) {
      const proposalResponse = await provider.callContract({
        contractAddress,
        entrypoint: 'get_proposal',
        calldata: CallData.compile({ proposal_id: i }),
      }, 'latest');
      const proposalResult = toResult(proposalResponse);
      const titleFelt = proposalResult[0] || '0x0';
      let title = `Proposal #${i + 1}`;
      try {
        title = shortString.decodeShortString(titleFelt);
      } catch {
        title = `Proposal #${i + 1}`;
      }

      proposals.push({
        id: i + 1,
        contractId: i,
        title,
        deadlineTs: Number(toBigInt(proposalResult[1] || 0)),
        isOpen: toBigInt(proposalResult[2] || 0) !== BigInt(0),
        forVotes: Number(toBigInt(proposalResult[3] || 0)),
        againstVotes: Number(toBigInt(proposalResult[4] || 0)),
      });
    }

    return NextResponse.json({ proposals }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { proposals: [], error: error instanceof Error ? error.message : String(error) },
      { status: 200 },
    );
  }
}
