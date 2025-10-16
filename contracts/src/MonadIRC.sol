// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MonadIRC
 * @notice Decentralized IRC chat system with session key authorization
 * @dev Implements session-based authentication for gasless message sending
 * @custom:security-contact security@monad-irc.xyz
 */
contract MonadIRC {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Session key authorization structure
    struct Session {
        address sessionKey;
        uint256 expiry;
        bool isAuthorized;
    }

    /// @notice Emitted when a session key is authorized
    event SessionAuthorized(
        address indexed smartAccount,
        address indexed sessionKey,
        uint256 expiry,
        uint256 timestamp
    );

    /// @notice Emitted when a session key is revoked
    event SessionRevoked(
        address indexed smartAccount,
        address indexed sessionKey,
        uint256 timestamp
    );

    /// @notice Emitted when a new channel is created
    event ChannelCreated(
        string channelName,
        address indexed creator,
        uint256 timestamp
    );

    /// @notice Emitted when a message is sent
    event MessageSent(
        bytes32 indexed msgHash,
        address indexed sessionKey,
        string channel,
        uint256 timestamp
    );

    /// @notice Maximum allowed timestamp drift (5 minutes)
    uint256 public constant MAX_TIMESTAMP_DRIFT = 300;

    /// @notice Mapping of smart accounts to their session data
    mapping(address => Session) public sessions;

    /// @notice Mapping to check if a channel exists
    mapping(string => bool) public channelExists;

    /// @notice Mapping of channel names to their creators
    mapping(string => address) public channelCreators;

    /// @notice Mapping to track processed messages (prevents replay)
    mapping(bytes32 => bool) public processedMessages;

    /// @notice Nonce tracking to prevent replay attacks
    mapping(address => uint256) public nonces;

    /// @notice Custom errors for gas optimization
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

    /**
     * @notice Authorize a session key for a smart account
     * @param sessionKey The public key of the session
     * @param expiry Unix timestamp when session expires
     */
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

    /**
     * @notice Revoke an active session
     */
    function revokeSession() external {
        Session storage session = sessions[msg.sender];
        if (!session.isAuthorized) revert NoActiveSession();

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
        if (bytes(channelName).length <= 1) revert ChannelNameTooShort();
        if (channelExists[channelName]) revert ChannelAlreadyExists();

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
        if (!channelExists[channel]) revert ChannelDoesNotExist();
        if (processedMessages[msgHash]) revert MessageAlreadyProcessed();
        if (!isSessionValid(smartAccount)) revert SessionInvalidOrExpired();
        if (nonce != nonces[smartAccount]) revert InvalidNonce();
        if (timestamp > block.timestamp + MAX_TIMESTAMP_DRIFT) {
            revert TimestampTooFarInFuture();
        }
        // Avoid underflow by restructuring the comparison
        if (timestamp + MAX_TIMESTAMP_DRIFT < block.timestamp) {
            revert TimestampTooOld();
        }

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(msgHash, channel, nonce, timestamp, smartAccount)
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        Session memory session = sessions[smartAccount];
        if (signer != session.sessionKey) revert InvalidSignature();

        // Mark message as processed and increment nonce
        processedMessages[msgHash] = true;
        nonces[smartAccount]++;

        emit MessageSent(msgHash, session.sessionKey, channel, block.timestamp);
    }

    /**
     * @notice Get session info for a smart account
     * @param smartAccount The smart account address
     * @return sessionKey The session key address
     * @return expiry The session expiry timestamp
     * @return isAuthorized Whether the session is authorized
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
     * @return The current nonce value
     */
    function getNonce(address smartAccount) external view returns (uint256) {
        return nonces[smartAccount];
    }
}

