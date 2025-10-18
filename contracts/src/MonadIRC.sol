// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MonadIRC
 * @notice Decentralized IRC chat system with session key authorization
 * @dev Improved: EIP-like domain binding (chain + contract), secure hashing, bytes32 channel keys
 */
contract MonadIRC {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Session {
        address sessionKey;
        uint256 expiry;
        bool isAuthorized;
    }

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
        bytes32 indexed channelId,
        string channelName,
        address indexed creator,
        uint256 timestamp,
        bytes32 txMeta
    );

    event MessageSent(
        bytes32 indexed msgHash,
        address indexed smartAccount,
        address indexed sessionKey,
        bytes32 channelId,
        uint256 timestamp
    );

    uint256 public constant MAX_TIMESTAMP_DRIFT = 300;

    mapping(address => Session) public sessions;
    mapping(bytes32 => bool) public channelExists;
    mapping(bytes32 => string) public channelNames;
    mapping(bytes32 => address) public channelCreators;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public nonces;

    /* Errors */
    error InvalidSessionKey();
    error ExpiryMustBeInFuture();
    error NoActiveSession();
    error ChannelNameTooShort();
    error ChannelAlreadyExists();
    error ChannelDoesNotExist();
    error MessageAlreadyProcessed();
    error SessionInvalidOrExpired();
    error InvalidNonce();
    error TimestampTooFarInFuture();
    error TimestampTooOld();
    error InvalidSignature();

    /// @notice Authorize a session key for a smart account (msg.sender must be smart account)
    function authorizeSession(address sessionKey, uint256 expiry) external {
        if (sessionKey == address(0)) revert InvalidSessionKey();
        if (expiry <= block.timestamp) revert ExpiryMustBeInFuture();

        sessions[msg.sender] = Session({
            sessionKey: sessionKey,
            expiry: expiry,
            isAuthorized: true
        });

        emit SessionAuthorized(msg.sender, sessionKey, expiry, block.timestamp);
    }

    function revokeSession() external {
        Session storage session = sessions[msg.sender];
        if (!session.isAuthorized) revert NoActiveSession();

        address sessionKey = session.sessionKey;
        session.isAuthorized = false;

        emit SessionRevoked(msg.sender, sessionKey, block.timestamp);
    }

    function isSessionValid(address smartAccount) public view returns (bool) {
        Session memory session = sessions[smartAccount];
        return session.isAuthorized && session.expiry > block.timestamp && session.sessionKey != address(0);
    }

    /** 
     * Helper: build a domain-bound hash including chainId & contract address
     */
    function _domainHash(bytes memory payload) internal view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), payload));
    }

    /**
     * Create channel signed by session key (sessionKey signed the domain-hash)
     */
    function createChannelSigned(
        string memory channelName,
        uint256 nonce,
        uint256 timestamp,
        address smartAccount,
        bytes memory signature
    ) external {
        if (bytes(channelName).length <= 1) revert ChannelNameTooShort();

        bytes32 channelId = keccak256(abi.encodePacked(channelName));
        if (channelExists[channelId]) revert ChannelAlreadyExists();
        if (!isSessionValid(smartAccount)) revert SessionInvalidOrExpired();
        if (nonce != nonces[smartAccount]) revert InvalidNonce();
        if (timestamp > block.timestamp + MAX_TIMESTAMP_DRIFT) revert TimestampTooFarInFuture();
        if (timestamp + MAX_TIMESTAMP_DRIFT < block.timestamp) revert TimestampTooOld();

        // Build payload and domain-bound hash
        bytes memory payload = abi.encode("CREATE_CHANNEL", channelId, nonce, timestamp, smartAccount);
        bytes32 digest = _domainHash(payload);
        bytes32 ethSigned = digest.toEthSignedMessageHash();
        address signer = ethSigned.recover(signature);

        Session memory session = sessions[smartAccount];
        if (signer != session.sessionKey) revert InvalidSignature();

        // Create channel
        channelExists[channelId] = true;
        channelNames[channelId] = channelName;
        channelCreators[channelId] = smartAccount;
        nonces[smartAccount]++;

        emit ChannelCreated(channelId, channelName, smartAccount, block.timestamp, keccak256(payload));
    }

    /**
     * Send message signed by session key
     */
    function sendMessageSigned(
        bytes32 msgHash,
        bytes32 channelId,
        uint256 nonce,
        uint256 timestamp,
        address smartAccount,
        bytes memory signature
    ) external {
        if (!channelExists[channelId]) revert ChannelDoesNotExist();
        if (processedMessages[msgHash]) revert MessageAlreadyProcessed();
        if (!isSessionValid(smartAccount)) revert SessionInvalidOrExpired();
        if (nonce != nonces[smartAccount]) revert InvalidNonce();
        if (timestamp > block.timestamp + MAX_TIMESTAMP_DRIFT) revert TimestampTooFarInFuture();
        if (timestamp + MAX_TIMESTAMP_DRIFT < block.timestamp) revert TimestampTooOld();

        bytes memory payload = abi.encode("SEND_MESSAGE", msgHash, channelId, nonce, timestamp, smartAccount);
        bytes32 digest = _domainHash(payload);
        bytes32 ethSigned = digest.toEthSignedMessageHash();
        address signer = ethSigned.recover(signature);

        Session memory session = sessions[smartAccount];
        if (signer != session.sessionKey) revert InvalidSignature();

        processedMessages[msgHash] = true;
        nonces[smartAccount]++;

        emit MessageSent(msgHash, smartAccount, session.sessionKey, channelId, block.timestamp);
    }

    /* View helpers */
    function getSession(address smartAccount) external view returns (address sessionKey, uint256 expiry, bool isAuthorized) {
        Session memory s = sessions[smartAccount];
        return (s.sessionKey, s.expiry, s.isAuthorized);
    }

    function getNonce(address smartAccount) external view returns (uint256) {
        return nonces[smartAccount];
    }

    function getChannelName(bytes32 channelId) external view returns (string memory) {
        return channelNames[channelId];
    }
}
