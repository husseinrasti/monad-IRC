// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MonadIRC
 * @notice Decentralized IRC chat system with session key authorization
 * @dev Implements session-based authentication for gasless message sending
 */
contract MonadIRC {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Session key authorization
    struct Session {
        address sessionKey;
        uint256 expiry;
        bool isAuthorized;
    }

    // Events
    event SessionAuthorized(
        address indexed smartAccount,
        address indexed sessionKey,
        uint256 expiry,
        uint256 timestamp
    );
    
    event SessionRevoked(
        address indexed smartAccount,
        address indexed sessionKey,
        uint256 timestamp
    );
    
    event ChannelCreated(
        string channelName,
        address indexed creator,
        uint256 timestamp
    );
    
    event MessageSent(
        bytes32 indexed msgHash,
        address indexed sessionKey,
        string channel,
        uint256 timestamp
    );

    // State
    mapping(address => Session) public sessions; // smartAccount => Session
    mapping(string => bool) public channelExists; // channelName => exists
    mapping(string => address) public channelCreators; // channelName => creator
    mapping(bytes32 => bool) public processedMessages; // msgHash => processed
    
    // Nonce tracking to prevent replay attacks
    mapping(address => uint256) public nonces;

    /**
     * @notice Authorize a session key for a smart account
     * @param sessionKey The public key of the session
     * @param expiry Unix timestamp when session expires
     */
    function authorizeSession(address sessionKey, uint256 expiry) external {
        require(sessionKey != address(0), "Invalid session key");
        require(expiry > block.timestamp, "Expiry must be in future");

        sessions[msg.sender] = Session({
            sessionKey: sessionKey,
            expiry: expiry,
            isAuthorized: true
        });

        emit SessionAuthorized(msg.sender, sessionKey, expiry, block.timestamp);
    }

    /**
     * @notice Revoke an active session
     */
    function revokeSession() external {
        Session storage session = sessions[msg.sender];
        require(session.isAuthorized, "No active session");

        address sessionKey = session.sessionKey;
        session.isAuthorized = false;

        emit SessionRevoked(msg.sender, sessionKey, block.timestamp);
    }

    /**
     * @notice Check if a session is valid
     * @param smartAccount The smart account address
     * @return bool True if session is valid and not expired
     */
    function isSessionValid(address smartAccount) public view returns (bool) {
        Session memory session = sessions[smartAccount];
        return session.isAuthorized && session.expiry > block.timestamp;
    }

    /**
     * @notice Create a new channel
     * @param channelName Name of the channel (should start with #)
     */
    function createChannel(string memory channelName) external {
        require(bytes(channelName).length > 1, "Channel name too short");
        require(!channelExists[channelName], "Channel already exists");

        channelExists[channelName] = true;
        channelCreators[channelName] = msg.sender;

        emit ChannelCreated(channelName, msg.sender, block.timestamp);
    }

    /**
     * @notice Send a message using session key signature
     * @param msgHash Hash of the message content
     * @param channel Channel name
     * @param nonce Nonce for replay protection
     * @param timestamp Message timestamp
     * @param smartAccount The smart account that authorized this session
     * @param signature Signature from session key
     */
    function sendMessageSigned(
        bytes32 msgHash,
        string memory channel,
        uint256 nonce,
        uint256 timestamp,
        address smartAccount,
        bytes memory signature
    ) external {
        require(channelExists[channel], "Channel does not exist");
        require(!processedMessages[msgHash], "Message already processed");
        require(isSessionValid(smartAccount), "Session invalid or expired");
        require(nonce == nonces[smartAccount], "Invalid nonce");
        require(timestamp <= block.timestamp + 300, "Timestamp too far in future");
        require(timestamp >= block.timestamp - 300, "Timestamp too old");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(msgHash, channel, nonce, timestamp, smartAccount)
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        Session memory session = sessions[smartAccount];
        require(signer == session.sessionKey, "Invalid signature");

        // Mark message as processed and increment nonce
        processedMessages[msgHash] = true;
        nonces[smartAccount]++;

        emit MessageSent(msgHash, session.sessionKey, channel, block.timestamp);
    }

    /**
     * @notice Get session info for a smart account
     * @param smartAccount The smart account address
     */
    function getSession(address smartAccount) 
        external 
        view 
        returns (address sessionKey, uint256 expiry, bool isAuthorized) 
    {
        Session memory session = sessions[smartAccount];
        return (session.sessionKey, session.expiry, session.isAuthorized);
    }

    /**
     * @notice Get current nonce for a smart account
     * @param smartAccount The smart account address
     */
    function getNonce(address smartAccount) external view returns (uint256) {
        return nonces[smartAccount];
    }
}

