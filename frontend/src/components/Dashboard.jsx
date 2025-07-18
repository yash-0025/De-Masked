import {useState, useEffect} from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, FEES_DECIMALS } from '../utils/constants'
import { shortenAddress } from '../utils/helpers'

const Dashboard = ({
    address,
    userName,
    refreshUserData,
    showCustomModal,
    postTextFee,
    postImgaeFee,
    dmtBalance
}) => {

    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    cosnt [newPostImageUrl, setNewPostImageUrl] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const [ethAmountToBuy, setEthAmountToBuy] = useState('');
    cosnt [dmtAmountReceived, setDmtAmountReceived] = useState('0');
    const [isBuyingDMT, setIsBuyingDMT] = useState(false);


    const {writeContract:approveDMT, data: approveHash, error: approveError} = useWriteContract();
    const {writeContract: createPostContract, data: postHash, error: postError} = useWriteContract();
    const {writeContract: buyDMTContract, data: buyDMTHash, error: buyError} = useWriteContract();


    const {data:ethToDmtRate, refetch: refetchEthToDmtRate } = useReadContract({
        address: CONTRACT_ADDRESSES.DeMaskedToken,
        abi: CONTRACT_ABIS.DeMaskedToken,
        functionName: 'ethToDmtRate',
        query: {enabled: true},
    });


    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
      address: CONTRACT_ADDRESSES.DeMaskedToken,
      abi: CONTRACT_ABIS.DeMaskedToken,
      functionName: 'allowance',
      agrs: [address, CONTRACT_ADDRESSES.DeMaskedCore],
      query: {enabled: !!address},
    })


    const {data: postsCount, refetch: refetchPostsCount } = useReadContract ({
      address: CONTRACT_ADDRESSES.DeMaskedCore,
      abi: CONTRACT_ABIS.DeMaskedCore,
      functionName: 'getPostsCount',
    });


    useEffect(() => {
      const fetchAllPosts = async() => {
        if(postsCount == undefined) return;

        const readPostPromises = [];

        for (let i =0; i<Number(postsCount); i++) {
          readPostPromises.push(
            new Promise(async(resolve) => {
              try {
                const post = await window.wagmiConfig.readContract({
                  address: CONTRACT_ADDRESSES.DeMaskedCore,
                  abi: CONTRACT_ABIS.DeMaskedCore,
                  functionName: 'getPost',
                  args: [BigInt(i)],
                });
                resolve(post);
              } catch(e) {
                console.error(`Error fetching Post ID : ${i}:`, e);
                resolve(null);
              }
            })
          )
        }

        const allPosts = await Promise.all(readPostPromises);
        setPosts(allPosts.filter(Boolean).reverse());
      }

      fetchAllPosts();

    }, [postsCount, address]);


    useEffect(() => {
      if(ethAmountToBuy && !isNaN(parseFloat(ethAmountToBuy)) && ethToDmtRate !== undefined) {
        const ethWei = parseUnits(ethAmountToBuy, 18);
        const calculatedDmt = (ethWei * ethToDmtRate) / BigInt(10**18);
        setDmtAmountReceived(formatUnits(calculatedDmt, FEES_DECIMALS));
      } else {
        setDmtAmountReceived('0');
      }
    }, [ethAmountToBuy, ethToDmtRate]);


    const {isLoading: isApprovingPost, isSuccess: isApprovePostSuccess, isError: isApprovePostError , error: approvePostTxError} = useWaitForTransactionReceipt({
      hash: approveHash
    });
    const { isLoading: isCreatingPostTx, isSuccess: isPostSuccess, isError: isPostError, error: postTxError } = useWaitForTransactionReceipt({
      hash: postHash
    })
    const { isLoading: isBuyingDMTTx, isSuccess: isBuytDmtSuccess, isError: isBuyDmtError, error: buyDmtError} = useWaitForTransactionReceipt({
      hash: buyDMTHash
    });


    useEffect(() => {
      if(isApprovePostSuccess) {
        showCustomModal('DMT approval successful.!!! You can now create posts.', 'success'); setIsPosting(false); refetchAllowance();
      }
      if(isApprovePostError && approvePostTxError) {
        showCustomModal(`DMT approval failed : ${approvePostTxError.shortMessage || approvePostTxError.message}`, 'error'); setIsPosting(false);
      }
    }, [isApprovePostSuccess, isApprovePostError, approvePostTxError, showCustomModal, refetchAllowance ]);

    useEffect(() => {
      if(isPostSuccess) {
        showCustomModal('Post created Successfully!', 'success');
        setNewPostContent('');
        setNewPostImageUrl('');
        refreshUserData();
        refetchPostsCount();
        setIsPosting(false);
      }

      if(isPostError && postTxError) {
        showCustomModal(`Post Creation Failed : ${postTxError.shortMessage || postTxError.message}`, 'error');
        setIsPosting(false)
      }
    }, [isPostSuccess, isPostError, postTxError, showCustomModal, refreshUserData, refetchPostsCount]);

    useEffect(() => {
      if(isBuyDmtSuccess) {
        showCustomModal(`Successfully purchased ${dmtAmountReceived} DMT`, 'success');
        setEthAmountToBuy('');
        setDmtAmountReceived('0');
        refreshUserData()
        setIsBuyingDMT(false)
      }


      if(isBuyDmtError && buyDmtTxError) {
        showCustomModal(`Failed to purchase DMT: ${buyDmtTxError.shortMessage || buyDmtTxError.message}`, 'error');
        setIsBuyingDMT(false);
      }
    }, [isBuyDmtSuccess, isBuyDmtError, buyDmtTxError, showCustomModal, refreshUserData, dmtAmountReceived]);


    useEffect(() => {
      if(approveError || postError || buyDmtError) {
        const err = approveError || postError || buyDmtError;
        showCustomModal(`Transaction Error : ${err.shortMessage || err.message}`, 'error')
        setIsPosting(false);
        setIsBuyingDMT(false);
      }
    }, [approveError, postError, buyDmtError, showCustommodal]);


    const calculateFee = () => {
      if(newPostImageUrl.trim().length > 0) {
        return postImgaeFee;
      }
      if(newPostContent.trim().length > 0) {
        return postTextFee;
      }
      return '0';
    }

    const currentPostFee = calculateFee();
    const postFeeInBigNumber = parseUnits(currentPostFee, FEES_DECIMALS);
    const isAllowanceSufficientForPost = currentAllowance && currentAllowance >= postFeeInBigNumber;
    const isBalanceSufficientForPost = parseUnits(dmtBalance, FEES_DECIMALS >= postFeeInBigNumber); 

    const handleApprovePost = async () => {
      setIsPosting(true);
      try{
        approveDMT({
          address: CONTRACT_ADDRESSES.DeMaskedToken,
          abi: CONTRACT_ABIS.DeMaskedToken,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.DeMaskedCore, postFeeInBigNumber],
        })
      } catch(err) {
        console.error("Approve DMT for post error", err);
        showCustomModal(`Failed to initiate  DMT approval: ${err.shortMessage || err.message}`, 'error');
        setIsPosting(false);
      }
    }


    const handleCreatePost = async() => {
      setIsPosting(true);
      try {
        if(!isAllowanceSufficientForPost) {
          showCustomModal('Allowance is insufficient. Please approve DMT for posts firsts.',  'error');
          setIsPosting(false);
          return;
        }
        if(!isBalanceSufficientForPost) {
          showCustomModal(`Insufficient DMT balance for post . You need ${currentPostFee} DMT.`, 'error');
          setIsPosting(false);
          return;
        }

        createPostContract({
          address: CONTRACT_ADDRESSES.DeMaskedCore,
          abi: CONTRACT_ABIS.DeMaskedCore,
          functionName: 'createPost',
          args: [newPostContent, newPostImageUrl],
        })
      } catch (err) {
        console.error("Create post error." , err);
        showCustomModal(`Failed to initiate post creation :${err.shortMessage || err.message}`, 'error');
        setIsPosting(false);
      }
    }


    const handleButDMT = async() => {
      if(!ethAmountToBuy || parseFloat(ethAmountToBuy) <= 0) {
        showCustomModal('Please enter a valid ETH amount to buy.', 'info');
        return;
      }
      if(ethToDmtRate === 0) {
        showCustomModal('DMT purchase is currently disabled or exchange rate is zero.', 'error');
        return;
      }

      setIsBuyingDMT(false);
      try {
          const valueInWei = parseUnits(ethAmountToBuy, 18);
          buyDMTContract({
            address: CONTRACT_ADDRESSES.DeMaskedToken,
            abi:CONTRACT_ABIS.DeMaskedToken,
            functionName: 'buyTokens',
            value: valueInWei,
          })
      }catch(err) {
        console.error("Buy DMT error: ", err);
        showCustomModal(`Failed to initiate DMT purchase ${err.shortMessage || err.message}`, 'error');
        setIsBuyingDMT(false);
      }
    }
    
  return (
    <div className="bg-secondary-dark p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-accent-blue">DeMasked Dashboard</h2>

      {/* Buy DMT Section */}
      <div className="mb-8 p-4 bg-primary-dark rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-3">Buy More DMT Tokens</h3>
        <p className="text-sm text-gray-400 mb-2">
          Current Rate: 1 ETH = {ethToDmtRate ? formatUnits(ethToDmtRate, FEES_DECIMALS) : '...'} DMT
        </p>
        <input
          type="number"
          step="0.001"
          placeholder="Amount of ETH to spend"
          value={ethAmountToBuy}
          onChange={(e) => setEthAmountToBuy(e.target.value)}
          className="w-full p-3 rounded-md bg-secondary-dark border border-gray-600 text-text-light placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent mb-3"
          disabled={isBuyingDMT}
        />
        <p className="text-sm text-gray-400 mb-4">
          You will receive approximately: <span className="font-bold text-yellow-300">{dmtAmountReceived} DMT</span>
        </p>
        <button
          onClick={handleBuyDMT}
          disabled={isBuyingDMT || !ethAmountToBuy || parseFloat(ethAmountToBuy) <= 0}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isBuyingDMT || isBuyingDMTTx ? (
            <span className="animate-spin mr-2">⚙️</span>
          ) : (
            `Buy DMT with ETH`
          )}
        </button>
        {(isBuyingDMT || isBuyingDMTTx) && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Confirming DMT purchase...
          </p>
        )}
      </div>


      {/* Create Post Section */}
      <div className="mb-8 p-4 bg-primary-dark rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-3">Create New Post</h3>
        <textarea
          className="w-full p-3 rounded-md bg-secondary-dark border border-gray-600 text-text-light placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent mb-3"
          rows="3"
          placeholder="What's on your mind anonymously?"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          disabled={isPosting}
        ></textarea>
        <input
          type="text"
          placeholder="Image URL (optional)"
          value={newPostImageUrl}
          onChange={(e) => setNewPostImageUrl(e.target.value)}
          className="w-full p-3 rounded-md bg-secondary-dark border border-gray-600 text-text-light placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent mb-4"
          disabled={isPosting}
        />
        <p className="text-sm text-gray-400 mb-4">
          Cost: {newPostImageUrl.trim() ? `${postImageFee} DMT (Image Post)` : `${postTextFee} DMT (Text Post)`}
        </p>

        <div className="flex flex-col gap-3">
          {!isAllowanceSufficientForPost && (currentPostFee !== '0' && (newPostContent.trim() || newPostImageUrl.trim())) && (
            <button
              onClick={handleApprovePost}
              disabled={isPosting || isApprovingPost || (!newPostContent.trim() && !newPostImageUrl.trim())}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isPosting || isApprovingPost ? (
                <span className="animate-spin mr-2">⚙️</span>
              ) : (
                `1. Approve ${currentPostFee} DMT for Posts`
              )}
            </button>
          )}

          <button
            onClick={handleCreatePost}
            disabled={isPosting || isCreatingPostTx || (!newPostContent.trim() && !newPostImageUrl.trim()) || !isAllowanceSufficientForPost || !isBalanceSufficientForPost}
            className="w-full px-6 py-3 bg-accent-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isPosting || isCreatingPostTx ? (
              <span className="animate-spin mr-2">⚙️</span>
            ) : (
              `2. Post (Cost: ${currentPostFee} DMT)`
            )}
          </button>
        </div>
        {(isPosting || isApprovingPost || isCreatingPostTx) && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Waiting for transaction confirmation...
          </p>
        )}
      </div>

      {/* Posts Feed Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Latest Posts</h3>
        {posts.length === 0 ? (
          <p className="text-center text-gray-400">No posts yet. Be the first to share!</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.postId.toString()} className="bg-primary-dark p-4 rounded-lg shadow-md border border-gray-700">
                <div className="flex items-center mb-2">
                  <span className="font-bold text-accent-blue mr-2">{post.userName}</span>
                  <span className="text-sm text-gray-400">@{shortenAddress(post.author)}</span>
                  <span className="ml-auto text-sm text-gray-500">
                    {new Date(Number(post.timestamp) * 1000).toLocaleString()}
                  </span>
                </div>
                {post.content && <p className="mb-2 text-text-light">{post.content}</p>}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post Image"
                    className="mt-2 rounded-md max-h-64 object-cover w-full border border-gray-600"
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x200/2d3748/edf2f7?text=Image+Load+Error"; }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
