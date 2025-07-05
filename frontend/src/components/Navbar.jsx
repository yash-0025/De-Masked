import React from 'react'
import {shortenAddress} from '../utils/helpers';

const Navbar = ({isConnected, address, userName, dmtBalance, connectors, connect, disconnect, currentView, setCurrentView}) => {

    const handleDisconnect = () => {
        disconnect();
    }

    const navItemClass = (view) => {
        `px-4 py-2 rounded-md transition-colors ${
        currentView == view ? 'bg-accent-blue text-white' : 'hover:bg-secondary-dar'}`
    }


  return (
    <nav className="w-full max-w-4xl bg-secondary-dark p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 z-10">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl font-bold text-accent-blue">DeMasked</h1>
            <p className="text-sm opacity-80">Anonymous Decentralized Social</p>
          </div>
    
          {isConnected && (
            <div className="flex flex-col items-center md:items-end gap-1">
              <span className="text-sm">
                Wallet: <span className="font-semibold">{shortenAddress(address)}</span>
              </span>
              {userName && (
                <span className="text-md">
                  Username: <span className="font-bold text-accent-blue">{userName}</span>
                </span>
              )}
              <span className="text-sm">
                DMT Balance: <span className="font-semibold">{dmtBalance} DMT</span>
              </span>
            </div>
          )}
    
          <div className="flex flex-col md:flex-row items-center gap-3 mt-4 md:mt-0">
            {isConnected ? (
              <>
                {userName && ( // Only show navigation if user is registered
                  <>
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className={navItemClass('dashboard')}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('friends')}
                      className={navItemClass('friends')}
                    >
                      Friends
                    </button>
                    <button
                      onClick={() => setCurrentView('chat')}
                      className={navItemClass('chat')}
                    >
                      Chat
                    </button>
                  </>
                )}
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors shadow-md"
                >
                  Disconnect
                </button>
              </>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors shadow-md"
                  disabled={!connector.ready}
                >
                  Connect {connector.name}
                </button>
              ))
            )}
          </div>
        </nav>
  )
}

export default Navbar
