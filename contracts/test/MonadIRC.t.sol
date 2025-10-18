// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MonadIRC.sol";

contract MonadIRCTest is Test {
    MonadIRC public monadIRC;

    address public smartAccount;
    address public sessionKey;
    uint256 public sessionPrivateKey;
    address public smartAccount2;
    address public sessionKey2;
    uint256 public sessionPrivateKey2;

    uint256 public constant EXPIRY_FUTURE = 365 days;
    string public constant TEST_CHANNEL = "#general";
    string public constant TEST_CHANNEL_2 = "#random";

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

    function setUp() public {
        monadIRC = new MonadIRC();

        // Setup test accounts
        smartAccount = makeAddr("smartAccount");
        sessionPrivateKey = 0x1234;
        sessionKey = vm.addr(sessionPrivateKey);
        
        smartAccount2 = makeAddr("smartAccount2");
        sessionPrivateKey2 = 0x5678;
        sessionKey2 = vm.addr(sessionPrivateKey2);
    }

    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Helper to create domain-bound signature for channel creation
    function _signChannelCreation(
        string memory channelName,
        uint256 nonce,
        uint256 timestamp,
        address _smartAccount,
        uint256 _sessionPrivateKey
    ) internal view returns (bytes memory) {
        bytes32 channelId = keccak256(abi.encodePacked(channelName));
        bytes memory payload = abi.encode("CREATE_CHANNEL", channelId, nonce, timestamp, _smartAccount);
        bytes32 digest = keccak256(abi.encode(block.chainid, address(monadIRC), payload));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_sessionPrivateKey, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Helper to create domain-bound signature for message sending
    function _signMessage(
        bytes32 msgHash,
        bytes32 channelId,
        uint256 nonce,
        uint256 timestamp,
        address _smartAccount,
        uint256 _sessionPrivateKey
    ) internal view returns (bytes memory) {
        bytes memory payload = abi.encode("SEND_MESSAGE", msgHash, channelId, nonce, timestamp, _smartAccount);
        bytes32 digest = keccak256(abi.encode(block.chainid, address(monadIRC), payload));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_sessionPrivateKey, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    /*//////////////////////////////////////////////////////////////
                    SESSION AUTHORIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AuthorizeSession_Success() public {
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;

        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit SessionAuthorized(smartAccount, sessionKey, expiry, block.timestamp);

        monadIRC.authorizeSession(sessionKey, expiry);

        // Verify session storage
        (address storedKey, uint256 storedExpiry, bool isAuthorized) = monadIRC.getSession(smartAccount);
        assertEq(storedKey, sessionKey);
        assertEq(storedExpiry, expiry);
        assertTrue(isAuthorized);
        assertTrue(monadIRC.isSessionValid(smartAccount));
    }

    function test_AuthorizeSession_RevertWhen_ZeroAddress() public {
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;

        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.InvalidSessionKey.selector);
        monadIRC.authorizeSession(address(0), expiry);
    }

    function test_AuthorizeSession_RevertWhen_PastExpiry() public {
        uint256 expiry = block.timestamp - 1;

        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ExpiryMustBeInFuture.selector);
        monadIRC.authorizeSession(sessionKey, expiry);
    }

    function test_AuthorizeSession_RevertWhen_CurrentTimestamp() public {
        uint256 expiry = block.timestamp;

        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ExpiryMustBeInFuture.selector);
        monadIRC.authorizeSession(sessionKey, expiry);
    }

    function test_AuthorizeSession_CanOverwriteExisting() public {
        // First authorization
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + 100);

        // Overwrite with new session
        uint256 newExpiry = block.timestamp + 200;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey2, newExpiry);

        // Verify new session replaced old one
        (address storedKey, uint256 storedExpiry, bool isAuthorized) = monadIRC.getSession(smartAccount);
        assertEq(storedKey, sessionKey2);
        assertEq(storedExpiry, newExpiry);
        assertTrue(isAuthorized);
    }

    /*//////////////////////////////////////////////////////////////
                    SESSION REVOCATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RevokeSession_Success() public {
        // Authorize session first
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // Revoke session
        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit SessionRevoked(smartAccount, sessionKey, block.timestamp);
        monadIRC.revokeSession();

        // Verify session is no longer valid
        (,, bool isAuthorized) = monadIRC.getSession(smartAccount);
        assertFalse(isAuthorized);
        assertFalse(monadIRC.isSessionValid(smartAccount));
    }

    function test_RevokeSession_RevertWhen_NoActiveSession() public {
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.NoActiveSession.selector);
        monadIRC.revokeSession();
    }

    function test_RevokeSession_RevertWhen_AlreadyRevoked() public {
        // Authorize and revoke
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);
        
        vm.prank(smartAccount);
        monadIRC.revokeSession();

        // Try to revoke again
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.NoActiveSession.selector);
        monadIRC.revokeSession();
    }

    function test_IsSessionValid_ExpiredSession() public {
        uint256 expiry = block.timestamp + 100;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // Session should be valid now
        assertTrue(monadIRC.isSessionValid(smartAccount));

        // Warp past expiry
        vm.warp(expiry + 1);

        // Session should be invalid now
        assertFalse(monadIRC.isSessionValid(smartAccount));
    }

    /*//////////////////////////////////////////////////////////////
                CHANNEL CREATION SIGNED TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateChannelSigned_Success() public {
        // Authorize session
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        // Create channel
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, nonce, timestamp, smartAccount, sessionPrivateKey);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        
        vm.expectEmit(true, true, false, false);
        emit ChannelCreated(channelId, TEST_CHANNEL, smartAccount, block.timestamp, bytes32(0));

        monadIRC.createChannelSigned(TEST_CHANNEL, nonce, timestamp, smartAccount, signature);

        // Verify channel exists
        assertTrue(monadIRC.channelExists(channelId));
        assertEq(monadIRC.channelCreators(channelId), smartAccount);
        assertEq(monadIRC.getChannelName(channelId), TEST_CHANNEL);
        assertEq(monadIRC.getNonce(smartAccount), nonce + 1);
    }

    function test_CreateChannelSigned_RevertWhen_NameTooShort() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        string memory shortName = "#";
        bytes memory signature = _signChannelCreation(shortName, 0, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannelSigned(shortName, 0, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_EmptyName() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        string memory emptyName = "";
        bytes memory signature = _signChannelCreation(emptyName, 0, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannelSigned(emptyName, 0, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_DuplicateChannel() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        // Create first channel
        bytes memory signature1 = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, signature1);

        // Try to create duplicate
        bytes memory signature2 = _signChannelCreation(TEST_CHANNEL, 1, block.timestamp, smartAccount, sessionPrivateKey);
        
        vm.expectRevert(MonadIRC.ChannelAlreadyExists.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 1, block.timestamp, smartAccount, signature2);
    }

    function test_CreateChannelSigned_RevertWhen_InvalidSession() public {
        // Don't authorize session
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.SessionInvalidOrExpired.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_ExpiredSession() public {
        uint256 expiry = block.timestamp + 100;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // Warp past expiry
        vm.warp(expiry + 1);

        bytes memory signature = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.SessionInvalidOrExpired.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_InvalidNonce() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        uint256 wrongNonce = 999;
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, wrongNonce, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.InvalidNonce.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, wrongNonce, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_TimestampTooFarInFuture() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        uint256 futureTimestamp = block.timestamp + 400; // More than MAX_TIMESTAMP_DRIFT (300)
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, 0, futureTimestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.TimestampTooFarInFuture.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, futureTimestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_TimestampTooOld() public {
        vm.warp(1000); // Avoid underflow

        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        uint256 oldTimestamp = block.timestamp - 400; // More than MAX_TIMESTAMP_DRIFT
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, 0, oldTimestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.TimestampTooOld.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, oldTimestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_RevertWhen_InvalidSignature() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        // Sign with wrong private key
        uint256 wrongPrivateKey = 0x9999;
        bytes memory signature = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, wrongPrivateKey);

        vm.expectRevert(MonadIRC.InvalidSignature.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, signature);
    }

    function test_CreateChannelSigned_NonceIncrement() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        assertEq(monadIRC.getNonce(smartAccount), 0);

        // Create first channel
        bytes memory sig1 = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, sig1);
        assertEq(monadIRC.getNonce(smartAccount), 1);

        // Create second channel
        bytes memory sig2 = _signChannelCreation(TEST_CHANNEL_2, 1, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL_2, 1, block.timestamp, smartAccount, sig2);
        assertEq(monadIRC.getNonce(smartAccount), 2);
    }

    /*//////////////////////////////////////////////////////////////
                    MESSAGE SENDING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SendMessageSigned_Success() public {
        // Setup: authorize and create channel
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;
        bytes memory signature = _signMessage(msgHash, channelId, nonce, timestamp, smartAccount, sessionPrivateKey);

        vm.expectEmit(true, true, true, false);
        emit MessageSent(msgHash, smartAccount, sessionKey, channelId, block.timestamp);

        monadIRC.sendMessageSigned(msgHash, channelId, nonce, timestamp, smartAccount, signature);

        // Verify message processed
        assertTrue(monadIRC.processedMessages(msgHash));
        assertEq(monadIRC.getNonce(smartAccount), nonce + 1);
    }

    function test_SendMessageSigned_RevertWhen_ChannelDoesNotExist() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        bytes memory signature = _signMessage(msgHash, channelId, 0, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.ChannelDoesNotExist.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 0, block.timestamp, smartAccount, signature);
    }

    function test_SendMessageSigned_RevertWhen_DuplicateMessage() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Send first message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        bytes memory sig1 = _signMessage(msgHash, channelId, 1, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, block.timestamp, smartAccount, sig1);

        // Try to send duplicate (same msgHash)
        bytes memory sig2 = _signMessage(msgHash, channelId, 2, block.timestamp, smartAccount, sessionPrivateKey);
        
        vm.expectRevert(MonadIRC.MessageAlreadyProcessed.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 2, block.timestamp, smartAccount, sig2);
    }

    function test_SendMessageSigned_RevertWhen_InvalidSession() public {
        // Create channel first (with session)
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Revoke session
        vm.prank(smartAccount);
        monadIRC.revokeSession();

        // Try to send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        bytes memory signature = _signMessage(msgHash, channelId, 1, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.SessionInvalidOrExpired.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, block.timestamp, smartAccount, signature);
    }

    function test_SendMessageSigned_RevertWhen_InvalidNonce() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Try with wrong nonce
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        uint256 wrongNonce = 999;
        bytes memory signature = _signMessage(msgHash, channelId, wrongNonce, block.timestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.InvalidNonce.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, wrongNonce, block.timestamp, smartAccount, signature);
    }

    function test_SendMessageSigned_RevertWhen_TimestampTooFarInFuture() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Try with future timestamp
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        uint256 futureTimestamp = block.timestamp + 400;
        bytes memory signature = _signMessage(msgHash, channelId, 1, futureTimestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.TimestampTooFarInFuture.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, futureTimestamp, smartAccount, signature);
    }

    function test_SendMessageSigned_RevertWhen_TimestampTooOld() public {
        vm.warp(1000);
        
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Try with old timestamp
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        uint256 oldTimestamp = block.timestamp - 400;
        bytes memory signature = _signMessage(msgHash, channelId, 1, oldTimestamp, smartAccount, sessionPrivateKey);

        vm.expectRevert(MonadIRC.TimestampTooOld.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, oldTimestamp, smartAccount, signature);
    }

    function test_SendMessageSigned_RevertWhen_InvalidSignature() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Sign with wrong key
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        uint256 wrongKey = 0x9999;
        bytes memory signature = _signMessage(msgHash, channelId, 1, block.timestamp, smartAccount, wrongKey);

        vm.expectRevert(MonadIRC.InvalidSignature.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, block.timestamp, smartAccount, signature);
    }

    function test_SendMultipleMessages_NonceIncrement() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Send 3 messages
        for (uint256 i = 0; i < 3; i++) {
            bytes32 msgHash = keccak256(abi.encodePacked("Message ", i));
            uint256 nonce = monadIRC.getNonce(smartAccount);
            bytes memory signature = _signMessage(msgHash, channelId, nonce, block.timestamp, smartAccount, sessionPrivateKey);
            
            monadIRC.sendMessageSigned(msgHash, channelId, nonce, block.timestamp, smartAccount, signature);
            
            assertTrue(monadIRC.processedMessages(msgHash));
            assertEq(monadIRC.getNonce(smartAccount), nonce + 1);
        }

        // Final nonce should be 4 (1 for channel creation + 3 messages)
        assertEq(monadIRC.getNonce(smartAccount), 4);
    }

    /*//////////////////////////////////////////////////////////////
                        REPLAY PROTECTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ReplayProtection_ChannelCreation_CannotReuseNonce() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        // Create first channel
        bytes memory sig1 = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, sig1);

        // Try to create another channel with reused nonce (0)
        vm.expectRevert(MonadIRC.InvalidNonce.selector);
        monadIRC.createChannelSigned(TEST_CHANNEL_2, 0, block.timestamp, smartAccount, sig1);
    }

    function test_ReplayProtection_Message_CannotReuseMsgHash() public {
        // Setup
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        bytes memory sig1 = _signMessage(msgHash, channelId, 1, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, block.timestamp, smartAccount, sig1);

        // Try to send same msgHash again (even with different nonce)
        bytes memory sig2 = _signMessage(msgHash, channelId, 2, block.timestamp, smartAccount, sessionPrivateKey);
        
        vm.expectRevert(MonadIRC.MessageAlreadyProcessed.selector);
        monadIRC.sendMessageSigned(msgHash, channelId, 2, block.timestamp, smartAccount, sig2);
    }

    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FullWorkflow() public {
        // 1. Authorize session
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        // 2. Create channel
        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // 3. Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad IRC!"));
        bytes memory msgSig = _signMessage(msgHash, channelId, 1, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.sendMessageSigned(msgHash, channelId, 1, block.timestamp, smartAccount, msgSig);

        // 4. Verify everything
        assertTrue(monadIRC.isSessionValid(smartAccount));
        assertTrue(monadIRC.channelExists(channelId));
        assertTrue(monadIRC.processedMessages(msgHash));
        assertEq(monadIRC.getNonce(smartAccount), 2);
        assertEq(monadIRC.getChannelName(channelId), TEST_CHANNEL);
    }

    function test_MultiUserWorkflow() public {
        // User 1: Authorize and create channel
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory channelSig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, channelSig);

        // User 2: Authorize session
        vm.prank(smartAccount2);
        monadIRC.authorizeSession(sessionKey2, block.timestamp + EXPIRY_FUTURE);

        // User 1 sends message
        bytes32 msg1Hash = keccak256(abi.encodePacked("Hello from user 1"));
        bytes memory msg1Sig = _signMessage(msg1Hash, channelId, 1, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.sendMessageSigned(msg1Hash, channelId, 1, block.timestamp, smartAccount, msg1Sig);

        // User 2 sends message
        bytes32 msg2Hash = keccak256(abi.encodePacked("Hello from user 2"));
        bytes memory msg2Sig = _signMessage(msg2Hash, channelId, 0, block.timestamp, smartAccount2, sessionPrivateKey2);
        monadIRC.sendMessageSigned(msg2Hash, channelId, 0, block.timestamp, smartAccount2, msg2Sig);

        // Verify
        assertTrue(monadIRC.processedMessages(msg1Hash));
        assertTrue(monadIRC.processedMessages(msg2Hash));
        assertEq(monadIRC.getNonce(smartAccount), 2);  // 1 channel + 1 message
        assertEq(monadIRC.getNonce(smartAccount2), 1); // 1 message
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetSession_NonExistent() public {
        (address key, uint256 exp, bool auth) = monadIRC.getSession(smartAccount);
        assertEq(key, address(0));
        assertEq(exp, 0);
        assertFalse(auth);
    }

    function test_GetNonce_DefaultIsZero() public {
        assertEq(monadIRC.getNonce(smartAccount), 0);
        assertEq(monadIRC.getNonce(smartAccount2), 0);
    }

    function test_GetChannelName() public {
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        bytes32 channelId = keccak256(abi.encodePacked(TEST_CHANNEL));
        bytes memory sig = _signChannelCreation(TEST_CHANNEL, 0, block.timestamp, smartAccount, sessionPrivateKey);
        monadIRC.createChannelSigned(TEST_CHANNEL, 0, block.timestamp, smartAccount, sig);

        assertEq(monadIRC.getChannelName(channelId), TEST_CHANNEL);
    }
}
