import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import {createConfig, WagmiProvider} from 'wagmi';
import {sepolia} from 'wagmi/chains';
import {http} from 'viem';


import { injected } from '@wagmi/connectors'
import {walletConnect} from 'wagmi/connectors';
import {coinbaseWallet} from 'wagmi/connectors';


const projectId = import.meta.env.VITE_PROJECT_ID

const chains = [sepolia]

const wagmiConfig = createConfig({
  chains,
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({
        projectId,
        showQrModal: true,
    }),
    coinbaseWallet({
      chains,
        appName: 'DeMasked',
    }),
  ],
})
console.log(wagmiConfig)
// console.log(chains)
// console.log(http)

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <WagmiProvider config={wagmiConfig}>
    <App />
    </WagmiProvider>
  </StrictMode>,
)
