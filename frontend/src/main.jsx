import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {createConfig, WagmiProvider} from 'wagmi';
import {sepolia} from 'wagmi/chains';
import {http} from 'viem';
import { InjectedConnector } from 'wagmi/connectors/injected'
import {WalletConnectConnector} from 'wagmi/connectors/walletConnect';
import {CoinbaseWalletConnector} from 'wagmi/connectors/coinbaseWallet';


const projectId = import.meta.env.VITE_PROJECT_ID

const chains = [sepolia]

const wagmiConfig = createConfig({
  chains,
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [
    new InjectedConnector({chains}),
    new WalletConnectConnector({
      chains, options: {
        projectId,
        showQrModal: true,
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'DeMasked',
      },
    }),
  ],
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <WagmiProvider config={wagmiConfig}>
    <App />
    </WagmiProvider>
  </StrictMode>,
)
