import React,{useState, useEffect} from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, FEES_DECIMALS } from '../utils/constants'
import { shortenAddress } from '../utils/helpers'
import { isAddress } from 'viem'


const FriendList = ({
    address,
    userName,
    refreshUserData,
    showCustomModal,
    sendFriendRequestFee,
    onSelectFriendForChat,
    dmtBalance,
    socket
}) => {

    const [friendAddressInput, setFriendAddressInput] = useState('');
    const [friends, setFriends] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [isProcessingFriendship, setIsProcessingFriendship] = useState(false);

    const {writeContract:approveDmt, data: approveHash, error: approveError} = useWriteContract();


    const {writeContract: sendFriendRequestContract, data: sendRequestHash, error: sendRequestError} = useWriteContract();
    const {writeContract:acceptFriendRequestContract, data:acceptRequestHash, error: acceptRequestError} = useWriteContract();
    const { writeContract: declineFriendRequestContract, data: declineRequestHash,
    error: declineRequestError } = useWriteContract();
    const {writeContract: removeFriendContract, data: removeFriendHash, error: removeFriendError} = useWriteContract();


    const {data: fetchedFriendAddresses, refetch: refetchFriendAddresses} = useReadContract({
        address: CONTRACT_ADDRESSES.DeMaskedCore,
        abi: CONTRACT_ABIS.DeMaskedCore,
        functionName: 'getFriendsList',
        args: [address],
        query: {enabled: !!address},
    })

    const {data: fetchedSentRequestAddresses, refetch: refetchSentRequests} = useReadContract({
        address: CONTRACT_ADDRESSES.DeMaskedCore,
        abi: CONTRACT_ABIS.DeMaskedCore,
        functionName: 'getSentRequests',
        args: [address],
        query: {enabled: !!address},
    })

    const {data:fetchedReceivedRequestAddresses, refetch: refetchReceivedRequests} = useReadContract({
        address: CONTRACT_ADDRESSES.DeMaskedCore,
        abi: CONTRACT_ABIS.DeMaskedCore,
        functionName: 'getReceivedRequests',
        args: [address],
        query: {enabled: !!address},
    })

    useEffect(() => {
        const processAddresses = async (addresses, type) => {
            if(!addresses || addresses.length === 0) return []
            const detailsPromises = addresses.map(async(addr) => {
                try {
                    const name = await window.wagmiConfig.readContract({
                        address: CONTRACT_ADDRESSES.DeMaskedCore,
                        abi: CONTRACT_ABIS.DeMaskedCore,
                        functionName: 'userNames',
                        args: [addr],
                    })
                    return {address:addr, userName: name || shortenAddress(addr)}
                } catch(e) {
                    console.error(`Error fetching username for ${addr} (${type} type)`, e);
                    return{address: addr, userName: shortenAddress(addr)}
                }
            })
            return Promise.all(detailsPromises);
        }

        const updateLists = async() => {
            const updatedFriends = await processAddresses(fetchedFriendAddresses, 'friend');
            setFriends(updatedFriends);

            const updatedSentRequests = await processAddresses(fetchedSentRequestAddresses, 'sentRequest');
            setSentRequests(updatedSentRequests);

            const updatedReceivedRequests = await processAddresses(fetchedReceivedRequestAddresses, 'receivedRequest');
            setReceivedRequests(updatedReceivedRequests);

            if(addresss && socket && socket.connected) {
                socket.emit('updateFriendsList', { userAddress: address, friends: fetchedFriendAddresses || []});
            }
        }
        updateLists();
    }, [fetchedFriendAddresses, fetchedSentRequestAddresses, fetchedSentRequestAddresses, address, socket]);


    const {isLoading: isApproving, isSuccess: isApproveSuccess, isError: isApproveError, error: approveTxError} = useWaitForTransactionReceipt({hash: approveHash})

    const {isLoading: isSendingReq, isSuccess: isSendReqSuccess, isError: isSendReqError, error:sendReqTxError} = useWaitForTransactionReceipt({hash:sendRequestHash })

    const {isLoading: isAcceptingReq , isSuccess: isAcceptReqSuccess , isError: isAcceptReqError, error:acceptReqTxError} = useWaitForTransactionReceipt({hash:acceptRequestHash })

    const {isLoading: isDecliningReq , isSuccess: isDeclineReqSuccess , isError: isDeclineReqError, error: declineReqTxError} = useWaitForTransactionReceipt({hash: declineRequestHash })

    const {isLoading: isRemovingFriend, isSuccess: isRemoveFriendSuccess, isError: isRemoveFriendError, error: removeFriendTxError} = useWaitForTransactionReceipt({hash: removeFriendHash})


    useEffect(() => {
        if(isApproveSuccess) {
            showCustomModal('DMT approval successful! You can now send friend Requests.', 'success'); setIsProcessingFriendship(false); refetchAllowance()}
        if(isApproveError && approveTxError) {
            showCustomModal(`DMT approval failed: ${approveTxError.shortMessage || approveTxError.message}`, 'error') 
            setIsProcessingFriendship(false)
        }   
    }, [isApproveSuccess, isApproveError, approveTxError, showCustomModal, refetchAllowance])

    useEffect(() => {
        if(isSendReqSuccess) { showCustomModal('Friend request sent ', 'success') 
            setFriendAddressInput('')
            refreshAllFriendData()
            setIsProcessingFriendship(false)
        }
        if(isSendReqError && sendReqTxError) {
            showCustomModal(`Failed to send request: ${sendReqTxError.shortMessage || sendReqTxError.message}`, 'error')
            setIsProcessingFriendship(false)
        }
    }, [isSendReqSuccess, isSendReqError, sendReqTxError, showCustomModal, refreshAllFriendData]);

    useEffect(() => {
        if(isAcceptReqSuccess) { showCustomModal('Friend request accepted! You are now friends.', 'success')
            refreshAllFriendData()
            setIsProcessingFriendship(false)
        }
        if(isAcceptReqError && acceptReqTxError) {
            showCustomModal(`Failed  to accept request: ${acceptReqTxError.shortMessage || sendReqTxError.message}`, 'error')
            setIsProcessingFriendship(false)
        }
    }, [isAcceptReqSuccess, isAcceptReqError, acceptReqTxError, showCustomModal,refreshAllFriendData])

    useEffect(() => {
        if(isDeclineReqSuccess) {
            showCustomModal('Friend request declined.', 'info')
            refreshAllFriendData()
            setIsProcessingFriendship(false)
        }
        if(isDeclineReqError && declineReqTxError) {
            showCustomModal(`Failed to decline request: ${declineReqTxError.shortMessage || declineReqTxError.message}`,'error')
            setIsProcessingFriendship(false)
        }
    },[isDeclineReqSuccess, isDeclineReqError, declineReqTxError, showCustomModal, refreshAllFriendData]);


    useEffect(() => {
        if(isRemoveFriendSuccess){
            showCustomModal('Friend Removed.', 'info')
            refreshAllFriendData()
            setIsProcessingFriendship(false)
        }
        if(isRemoveFriendError && removeFriendTxError) {
            showCustomModal(`Failed to remove friend: ${removeFriendTxError.shortMessage || removeFriendTxError.message}`, 'error')
            setIsProcessingFriendship(false)
        }
    }, [isRemoveFriendSuccess, isRemoveFriendError, removeFriendTxError, showCustomModal, refreeshAllFriendData])

    useEffect(() => {
        if(approveError || sendRequestError || acceptRequestError || declineRequestError|| removeFriendError) {
            const err = approveError || sendRequestError || acceptRequestError || declineRequestError || removeFriendError
            showCustomModal(`Transaction Error: ${err.shortMessage || err.message}`, 'error')
            setIsProcessingFriendship(false)
        }
    },[approveError, sendRequestError,acceptRequestError, declineRequestError, removeFriendError, showCustomModal])

    const refreshAllFriendData = async() => {
        await refreshUserData();
        await refetchFriendAddresses()
        await refetchSentRequests()
        await refetchReceivedRequests()
    }

    const feeInBigNumber = parseUnits(sendFriendRequestFee, FEES_DECIMALS)
    const isAllowanceSufficient = currentAllowance && currentAllowance >= feeInBigNumber;
    const isBalanceSufficient = parseUnits(dmtBalance, FEES_DECIMALS) >= feeInBigNumber;

    const handleApprove = async() => {
        setIsProcessingFriendship(true)
        try{
            approveDMT({
                address: CONTRACT_ADDRESSES.DeMaskedToken,
                abi: CONTRACT_ABIS.DeMaskedToken,
                functionName: 'approve',
                args: [CONTRACT_ADDRESSES.DeMaskedCore, feeInBigNumber],
            })
        } catch(err) {
            console.error("Approve DMT for friend request error: ", err)
            showCustomModal(`Failed to initiate DMT approval: ${err.shortMessage || err.message}`, 'error');
            setIsProcessingFriendship(false)
        }
    }

    const handleSendFriendRequest = async() => {
        setIsProcessingFriendship(true);
        try {
            if(!isAddress(friendAddressInput)) {
                showCustomModal('Invalid Ethereum Address', "error");
                setIsProcessingFriendship(false)
                return
            }
            if(friendAddressInput.toLowerCase() === address.toLowerCase()) {
                showCustomModal('Cannot send Request to yourself', 'error')
                setIsProcessingFriendship(false)
                return
            }
            if(friends.some(f => f.address.toLowerCase() === friendAddressInput.toLowerCase())) {
                showCustomModal('You are already friends with this address', 'error')
                setIsProcessingFriendship(false)
                return
            }
            if(sentRequests.some(r => r.address.toLowerCase() === friendAddressInput.toLowerCase())) {
                showCustomModal('Friend request already sent to this address', 'info')
                setIsProcessingFriendship(false)
                return
            }
            if(receivedRequests.some(r => r.address.toLowerCase() === friendAddressInput.toLowerCase())) {
                showCustomModal('You have a pending request from this user. Please accept instead', 'info');
                setIsProcessingFriendship(false)
                return
            }
            if(!isAllowanceSufficient){
                showCustomModal('Allowance is insufficient. Please approve DMT first .', 'error')
                setIsProcessingFriendship(false)
                return
            }
            if(!isBalanceSufficient) {
                showCustomModal(`Insufficient DMT balance. You need ${sendFriendRequestFee} DMT`, 'error')
                setIsProcessingFriendship(false)
                return
            }

            sendFriendRequestContract({
                address: CONTRACT_ADDRESSES.DeMaskedCore,
                abi: CONTRACT_ABIS.DeMaskedCore,
                functionName: 'sendFriendRequest',
                args: [friendAddressInput]
            })
        } catch(err) {
            console.error('Send Friend REquest error', err);
            showCustomModal(`Failed to initiate friend REquest: ${err.shortMessage || err.message}`, 'error');
            setIsProcessingFriendship(false)
        }
    }

    const handleAcceptRequest = async(requesterAddress) => {
        setIsProcessingFriendship(true);
        try{
            acceptFriendRequestContract({
                address: CONTRACT_ADDRESSES.DeMaskedCore,
                abi: CONTRACT_ABIS.DeMaskedCore,
                functionName: 'acceptFriendRequest',
                args: [requesterAddress],
            })
        } catch(err) {
            console.error('Accept request error', err);
            showCustomModal(`Failed to accept request. ${err.shortMessage || err.message}`, 'error');
            setIsProcessingFriendship(false);
        }
    }

    const handleDeclineRequest = async(requesterAddress) => {
        setIsProcessingFriendship(true)
        try{
            declineFriendRequestContract({
                address: CONTRACT_ADDRESSES.DeMaskedCore,
                abi: CONTRACT_ABIS.DeMaskedCore,
                functionName: 'declineFriendRequest',
                args: [requesterAddress],
            })
        } catch(err) {
            console.error('Decline Request error', err);
            showCustomModal(`Failed to decline request: ${err.shortMessage || err.message}`, 'error');
            setIsProcessingFriendship(false);
        }
    }

    const handleRemoveFriend = async(friendToRemoveAddress) => {
        setIsProcessingFriendship(true)
        try{
            removeFriendContract({
                address: CONTRACT_ADDRESSES.DeMaskedCore,
                abi: CONTRACT_ABIS.DeMaskedCore,
                functionName: 'removeFriend',
                args: [friendToRemoveAddress],
            })
        } catch(err) {
            console.error('Failed to remove friend', err)
            showCustomModal(`Failed to remove friend: ${err.shortMessage || err.message}`, 'error');
            setIsProcessingFriendship(false)
        }
    }


  return (
    <div className="bg-secondary-dark p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-accent-blue">My Friends & Requests</h2>

      {/* Send Friend Request Section */}
      <div className="mb-8 p-4 bg-primary-dark rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-3">Send Friend Request</h3>
        <input
          type="text"
          placeholder="Enter user's wallet address (e.g., 0x...)"
          value={friendAddressInput}
          onChange={(e) => setFriendAddressInput(e.target.value)}
          className="w-full p-3 rounded-md bg-secondary-dark border border-gray-600 text-text-light placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent mb-3"
        />
        <p className="text-sm text-gray-400 mb-4">
          Cost to send request: <span className="font-bold">{sendFriendRequestFee} DMT</span>
        </p>

        <div className="flex flex-col gap-3">
          {!isAllowanceSufficient && (friendAddressInput.trim().length > 0 && isAddress(friendAddressInput)) && (
            <button
              onClick={handleApprove}
              disabled={isProcessingFriendship || isApproving || !friendAddressInput.trim()}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingFriendship || isApproving ? (
                <span className="animate-spin mr-2">⚙️</span>
              ) : (
                `1. Approve ${sendFriendRequestFee} DMT for Requests`
              )}
            </button>
          )}

          <button
            onClick={handleSendFriendRequest}
            disabled={isProcessingFriendship || isSendingReq || !friendAddressInput.trim() || !isAddress(friendAddressInput) || !isAllowanceSufficient || !isBalanceSufficient}
            className="w-full px-6 py-3 bg-accent-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingFriendship || isSendingReq ? (
              <span className="animate-spin mr-2">⚙️</span>
            ) : (
              `2. Send Friend Request (${sendFriendRequestFee} DMT)`
            )}
          </button>
        </div>
        {(isProcessingFriendship || isApproving || isSendingReq) && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Waiting for transaction confirmation...
          </p>
        )}
      </div>

      {/* Pending Friend Requests (Received) */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Pending Requests (Received)</h3>
        {receivedRequests.length === 0 ? (
          <p className="text-center text-gray-400">No pending requests.</p>
        ) : (
          <ul className="space-y-3">
            {receivedRequests.map((req) => (
              <li
                key={req.address}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary-dark p-3 rounded-lg shadow-md border border-gray-700 gap-2 sm:gap-4"
              >
                <div className="flex-grow">
                  <span className="font-bold text-lg text-red-300">{req.userName}</span>
                  <span className="text-sm text-gray-400 block sm:inline sm:ml-2 truncate">{req.address}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.address)}
                    disabled={isProcessingFriendship || isAcceptingReq}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.address)}
                    disabled={isProcessingFriendship || isDecliningReq}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sent Friend Requests */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Sent Requests</h3>
        {sentRequests.length === 0 ? (
          <p className="text-center text-gray-400">No sent requests.</p>
        ) : (
          <ul className="space-y-3">
            {sentRequests.map((req) => (
              <li
                key={req.address}
                className="flex items-center justify-between bg-primary-dark p-3 rounded-lg shadow-md border border-gray-700"
              >
                <span className="font-bold text-lg text-blue-300">{req.userName}</span>
                <span className="text-sm text-gray-400 ml-2 truncate">{req.address}</span>
                <span className="text-sm text-gray-500 italic ml-auto">Pending...</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Friends List (Confirmed) */}
      <div>
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">My Current Friends</h3>
        {friends.length === 0 ? (
          <p className="text-center text-gray-400">No friends yet. Send a request to get started!</p>
        ) : (
          <ul className="space-y-3">
            {friends.map((friend) => (
              <li
                key={friend.address}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary-dark p-3 rounded-lg shadow-md border border-gray-700 gap-2 sm:gap-4"
              >
                <div className="flex-grow">
                  <span className="font-bold text-lg text-yellow-300">{friend.userName}</span>
                  <span className="text-sm text-gray-400 block sm:inline sm:ml-2 truncate">{friend.address}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectFriendForChat(friend.address)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors shadow-md text-sm"
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend.address)}
                    disabled={isProcessingFriendship || isRemovingFriend}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unfriend
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default FriendList
