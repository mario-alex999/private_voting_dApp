"use client";
import { sepolia, mainnet, Chain } from "@starknet-react/chains";
import {
  alchemyProvider,
  argent,
  braavos,
  infuraProvider,
  jsonRpcProvider,
  lavaProvider,
  nethermindProvider,
  reddioProvider,
  StarknetConfig,
  starkscan,
  useInjectedConnectors,
} from "@starknet-react/core";
import { RpcProvider } from "starknet";
import { ArgentMobileConnector } from "starknetkit/argentMobile";
import { WebWalletConnector } from "starknetkit/webwallet";

interface StarknetProviderProps {
  children: React.ReactNode;
}

export function StarknetProvider({ children }: StarknetProviderProps) {
  const { connectors: injected } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: "always",
  });

  const connectors = [
    ...injected,
    new WebWalletConnector({ url: "https://web.argent.xyz" }),
    new ArgentMobileConnector(),
  ];

  const apiKey = process.env.NEXT_PUBLIC_API_KEY!;
  const nodeProvider = process.env.NEXT_PUBLIC_PROVIDER!;

  
  function rpc(chain: Chain) {
  return {
    nodeUrl: `https://rpc.starknet-testnet.lava.build/rpc/v0_9`
  }
}
 
const provider = jsonRpcProvider({ rpc });

  return (
    <StarknetConfig
      connectors={connectors}
      chains={[mainnet, sepolia]}
      provider={provider}
      explorer={starkscan}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
