// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DeMaskedCore
 * @dev The core contract for the DeMasked DApp, handling user management,
 * friend system, posting, and token-based fees. Messaging is handled off-chain.
 */

contract DeMaskedCore is Ownable {
    using Strings for uint256;

// --- State Variables ---

    IERC20 public immutable deMaskedToken;
    address public deMaskedTokenAddress;


    uint256 public registrationFee;
    uint256 public addFriendFee;
    uint256 public postTextFee;
    uint256 public postImageFee;
    uint256 public freeRegistrationTokens;

    // User management: wallet address -> username
    mapping(address => string) public userNames;
    // User management: username -> wallet address (for uniqueness check)
    mapping(string => address) public userNameToAddress;
    // User registration status
    mapping(address => bool) public isRegistered;
    // Friend system: user address -> friend address -> is friend
    mapping(address =>mapping(address => bool)) public friends;
    // Mapping to track pending friend requests: sender -> receiver -> true
    mapping(address => mapping(address => bool)) public pendingFriendRequests;

    // Store lists of friends for easier retrieval in Solidity (though iterating mappings is hard)
    mapping(address => address[]) public userFriendLists;
    mapping(address => address[]) public userSentRequests;
    mapping(address => address[]) public userReceivedRequests;

   // Post structure
    struct Post {
        address author;
        string userName;
        string content;
        string imageUrl;
        uint256 timestamp;
        uint256 postId;
    }

    Post[] public posts;
    uint256 private nextPostId;

   // --- Events ---
    event UserRegistered(address indexed user, string userName, uint256 receivedTokens);
    event FriendRequestSent(address indexed sender, address indexed receiver);
    event FriendRequestAccepted(address indexed accepter, address indexed requester);
    event FriendRequestDeclined(address indexed decliner, address indexed requester);
    event FriendRemoved(address indexed user1, address indexed user2);
    event PostCreated(address indexed author, string userName, uint256 postId, string content, string imageUrl, uint256 timestamp);


        // --- Constructor ---
    /**
     * @dev Constructor that initializes the contract with the DeMaskedToken address
     * and sets initial fees.
     * `Ownable(msg.sender)` is explicitly called for broader compiler compatibility.
     * @param _deMaskedTokenAddress The address of the deployed DeMaskedToken contract.
     */
    constructor(address _deMaskedTokenAddress) Ownable(msg.sender) {
        require(_deMaskedTokenAddressv != address(0), "Invalid DMT token Address");
        deMaskedTokenAddress = _deMaskedTokenAddress;
        deMaskedToken = IERC20(_deMaskedTokenAddress);

        // initial fees
        registrationFee = 0;
        sendFriendRequestFee = 30 * 10**18;
        postTextFee = 20 * 10**18;
        postImageFee = 50 * 10**18;
        freeRegistrationTokens = 500 *10**18;
        nextPostId = 0;
    }

    
    // --- Owner Functions (Fee Management) ---
    // All functions with `onlyOwner` modifier are inherited from Ownable and are callable by the owner.

    /**
     * @dev Sets the registration fee.
     * Can only be called by the contract owner.
     * @param _fee The new fee in DMT tokens.
     */

    function setRegistrationFee(uint256 _fee) public onlyOwner {
        registrationFee = _fee;
    }

     /**
     * @dev Sets the amount of free tokens a new user receives on registration.
     * Can only be called by the contract owner.
     * @param _amount The new amount of free tokens in DMT.
     */
    function setFreeRegistrationTokens(uint256 _amount) public onlyOwner {
        freeRegistrationTokens = _amount;
    }

    /**
     * @dev Sets the sendfriend request fee.
     * Can only be called by the contract owner.
     * @param _fee The new fee in DMT tokens.
     */
    function setSendFriendRequestFee(uint256 _fee) public onlyOwner {
        addFriendFee = _fee;
    }

     /**
     * @dev Sets the text post fee.
     * Can only be called by the contract owner.
     * @param _fee The new fee in DMT tokens.
     */
    function setPostTextFee(uint256 _fee) public onlyOwner {
        postTextFee = _fee
    }

    /**
     * @dev Sets the image post fee.
     * Can only be called by the contract owner.
     * @param _fee The new fee in DMT tokens.
    */
    function setPostImageFee(uint256 _fee) public onlyOwner {
        postImageFee = _fee;
    }



     // --- User Management ---
    /**
     * @dev Registers a new user with a unique username and provides free tokens.
     * No registration fee is required.
     * @param _userName The desired unique username.
     */

     function register(string calldata _userName) public {
        require(!isRegistered[msg.sender], "User already registered");
        require(bytes(_userName).length > 5, "Username should be 5 character long");
        require(userNameToAddress[_userName] == address(0), "Username already exists");

        userNames[msg.sender] = _userName;
        userNameToAddress[_userName] = msg.sender;
        isRegistered[msg.sender] = true;

        // Transfer freee 500 tokens
        require(deMaskedToken.transfer(msg.sender, freeRegistrationTokens), "Failed to transfer free tokens after registration");

        emit UserRegistered(msg.sender, _userName, freeRegistrationTokens);
     }

     /**
     * @dev Retrieves the username for a given address.
     * @param _user The address to query.
     * @return The username associated with the address, or an empty string if not registered.
     */
    function getUserName(address _user) public view returns (string memory) {
        return userNames[_user];
    }

    // --- Friend System ---
    /**
     * @dev Adds another user as a friend.
     * Requires payment of addFriendFee in DMT tokens.
     * Both users must be registered.
     * @param _friendAddress The address of the user to add as a friend.
     */
    function sendFriendRequest(address _receiver) public {
        require(msg.sender != _receiver, "You cannot send request to yourself");
        require(isRegistered[msg.sender], "Sender not Registered");
        require(isRegistered[_receiver], "Receiver is not registered");
        require(!friends[msg.sender][_receiver], "Already Friends");
        require(!pendingFriendRequests[msg.sender][_receiver], "Request already exists!");
        require(!pendingFriendRequests[_receiver][msg.sender], "Your friend has already sent you friend request please check and accept");

        require(deMaskedToken.transfer(msg.sender, address(this), sendFriendRequestFee), "Failed to transfer the friendRequest fee");
    
        pendingFriendRequests[msg.sender][_receiver] = true;
        userSentRequests[msg.sender].push(_receiver);
        userReceivedRequests[_receiver].push(msg.sender);

        emit FriendRequestSent(msg.sender,_receiver);
    }


    /**
     * @dev Accepts a pending friend request.
     * No direct DMT fee for accepting.
     * Establishes a mutual friendship and removes the pending request.
     * @param _requester The address of the user who sent the request.
     */
    function acceptFriendRequest(address _requester) public {
        require(msg.sender != _requester, "You cannot accept your own request");
        require(isRegistered[msg.sender], "You are not registered to the platform");
        require(isRegistered[_requester], "Requester is not registered");
        require(pendingFriendRequests[_requester][msg.sender], "No pending friend request from this user");
        require(!friends[msg.sender][_requester], "You are already friends");

        friends[msg.sender][_requester] = true;
        friends[_requester][_requester] = true;

        userFriendLists[msg.sender][_requester] = true;
        userFriendLists[_requester][msg.sender] = true

        pendingFriendRequests[_requester][msg.sender] = false;
        _removeAddressFromArray(userSentRequests[_requester], msg.sender);
        _removeAddressFromArray(userReceivedRequests[msg.sender], _requester);

        emit FriendRequestAccepted(msg.sender, _requester);
    }

    function declineFriendRequest(address _requester) public {
        require(msg.sender != requester, "Cannot decline request from yourself");
        require(isRegistered[msg.sender], "User not registered");
        require(isRegistered[_requester], "Friend is not registered");
        require(pendingFriendRequests[_requester][msg.sender], "No pending request to decline from this user");
        require(!friends[msg.sender][_requester], "Already friends you cannot decline if you are already friends");

        pendingFriendRequests[_requester][msg.sender] = false;
        _removeAddressFromArray(userSentRequests[_requester],msg.sender);
        _removeAddressFromArray(userReceivedRequests[msg.sender], _requester);

        emit FriendRequestDeclined(msg.sender, _requester);
    }

 /**
     * @dev Removes an existing friend.
     * Breaks the mutual friendship.
     * @param _friendAddress The address of the friend to remove.
     */
    function removeFriend(address _friendAddress) public {
        require(msg.sender != _friendAddress, "Cannot unfriend yourself");
        require(isRegistered[msg.sender], "User is not registered");
        require(isRegistered[_friendAddress], "Friend is not registered");
        require(friends[msg.sender][_friendAddress],"Not friends with this user");

        friends[msg.sender][_friendAddress] = false;
        friends[_friendAddress][msg.sender] = false;

        _removeAddressFromArray(userFriendLists[msg.sender],_friendAddress);
        _removeAddressFromArray(userFriendLists[_friendAddress],msg.sender);

        emit FriendRemoved(msg.sender, _friendAddress);
    }



// ----------------     HELPER FUNCTIONS ---------------------
    /**
     * @dev Internal helper function to remove an address from an array.
     * @param arr The array to modify.
     * @param element The element to remove.
     */

    function _removeAddressFromArray(address[] storage arr, address element) internal {
        for(uint i = 0; i <arr.length; i++) {
            if(arr[i] == element) {
                arr[i] = arr[arr.length - 1]
                arr.pop();
                return;
            }
        }
    }

    /**
     * @dev Checks if two addresses are friends.
     * @param _user1 The first user's address.
     * @param {address} _user2 The second user's address.
     * @return {bool} True if they are friends, false otherwise.
     */
    function areFriends(address _user1, address _user2) public view returns (bool) {
        return friends[_user1][_user2];
    }

    /**
     * @dev Retrieves the list of friends for a given user.
     * @param _user The user's address.
     * @return An array of friend addresses.
     */
    function getFriendsList(address _user) public view returns (address[] memory) {
        return userFriendLists[_user];
    }

   /**
     * @dev Retrieves the list of pending friend requests sent by a user.
     * @param _user The user's address.
     * @return An array of addresses to whom requests were sent.
     */
    function getSentRequests(address _user) public view returns (address[] memory) {
        return userSentRequests[_user];
    }

   /**
     * @dev Retrieves the list of pending friend requests received by a user.
     * @param _user The user's address.
     * @return An array of addresses from whom requests were received.
     */
    function getReceivedRequests(address _user) public view returns (address[] memory) {
        return userReceivedRequests[_user];
    }


    // ------------------------- POSTS ----------
        /**
     * @dev Creates a new post (text or image).
     * Requires payment of postTextFee or postImageFee in DMT tokens.
     * User must be registered.
     * @param _content The text content of the post.
     * @param _imageUrl The URL of the image, empty string if no image.
     */
    function createPost(string calldata _content, string calldata _imageUrl) public {
        require(isRegistered[msg.sender], "User is not registered");
        require(bytes(_content).length > 0 || bytes(_imageUrl).length > 0, "Post cannot be empty");

        uint256 fee;
        if(bytes(_content).length > 0 && bytes(_imageUrl).length > 0) {
            fee = postImageFee + postTextFee;
        } else if (bytes(_imageUrl).length > 0 ) {
            fee = postImageFee;
        } else {
            fee = postTextFee;
        }

        require(deMaskedToken.transferFrom(msg.sender, address(this), fee), "DMT token transfer failed");

        posts.push(Post({
            author: msg.sender,
            userName: userNames[msg.sender],
            content: _imageUrl,
            timestamp: block.timestamp,
            postId: nextPostId
        }));
        emit PostCreated(msg.sender, userNames[msg.sender], nextPostId, _content, _imageUrl, block.timestamp);
        nextPostId++;
    }
}