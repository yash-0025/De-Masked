import {useState, useEffect} from 'react';
import './App.css'
import {useAccount, useReadContract, useBalance, useConnect, useDisconnect} from 'wagmi';
import {parseUnits, formatUnits} from 'viem';
import {CONTRACT_ADDRESSES, CONTRACT_ABIS, FEES_DECIMALS} from './utils/constants';


import Navbar from './components/Navbar';



// import {io} from 'socket.io-client'
// const socket = io('http://localhost:3000');




function App() {

  const {address, isConnected} = useAccount();
  const {connect, connectors, status, error} = useConnect();
  const {disconnect} = useDisconnect();

  const [userName, setUserName] = useState('');
  const [isUserRegistered, setUserRegistered] = useState(false);
  const [dmtBalance, setDmtBalance] = useState('0');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedFriend, setSelectedFriends] = useState(null);
  const [coreContractFees, setCorecontractFees] = useState({
    registrationFee: '0',
    sendFriendRequestFee: '0',
    postTextFee: '0',
    postImageFee: '0',
  })


  

  return (
  <div className='text-black '>
  <h1 className='font-bold text-2xl '>Welcome to De-Masked</h1>
  <Navbar 
  isConnected={isConnected}
  address={address}
  userName={userName}
  dmtBalance={dmtBalance}
  connectors={connectors}
  connect={connect}
  disconnect={disconnect}
  currentView={currentView}
  setCurrentView={setCurrentView}
  />
  </div>
  )
}

export default App
