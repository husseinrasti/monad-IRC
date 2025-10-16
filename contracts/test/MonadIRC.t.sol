// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MonadIRC.sol";

contract MonadIRCTest is Test {
    MonadIRC public monadIRC;

    address public smartAccount;
    address public sessionKey;
    uint256 public sessionPrivateKey;
    address public user2;
    address public user3;

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

    event ChannelCreated(string channelName, address indexed creator, uint256 timestamp);

    event MessageSent(
        bytes32 indexed msgHash,
        address indexed sessionKey,
        string channel,
        uint256 timestamp
    );

    function setUp() public {
        monadIRC = new MonadIRC();

        // Setup test accounts
        smartAccount = makeAddr("smartAccount");
        sessionPrivateKey = 0x1234;
        sessionKey = vm.addr(sessionPrivateKey);
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
    }

    /*//////////////////////////////////////////////////////////////
                        SESSION AUTHORIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AuthorizeSession() public {
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;

        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit SessionAuthorized(smartAccount, sessionKey, expiry, block.timestamp);

        monadIRC.authorizeSession(sessionKey, expiry);

        // Verify session was created
        (address storedKey, uint256 storedExpiry, bool isAuthorized) =
            monadIRC.getSession(smartAccount);

        assertEq(storedKey, sessionKey);
        assertEq(storedExpiry, expiry);
        assertTrue(isAuthorized);
        assertTrue(monadIRC.isSessionValid(smartAccount));
    }

    function test_RevertWhen_AuthorizeSessionWithZeroAddress() public {
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;

        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.InvalidSessionKey.selector);
        monadIRC.authorizeSession(address(0), expiry);
    }

    function test_RevertWhen_AuthorizeSessionWithPastExpiry() public {
        uint256 expiry = block.timestamp - 1;

        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ExpiryMustBeInFuture.selector);
        monadIRC.authorizeSession(sessionKey, expiry);
    }

    function test_AuthorizeSession_OverwriteExisting() public {
        // First authorization
        uint256 expiry1 = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry1);

        // Create new session key
        uint256 newSessionPrivateKey = 0x5678;
        address newSessionKey = vm.addr(newSessionPrivateKey);

        // Second authorization (overwrite)
        uint256 expiry2 = block.timestamp + EXPIRY_FUTURE + 30 days;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(newSessionKey, expiry2);

        // Verify new session replaced old one
        (address storedKey, uint256 storedExpiry, bool isAuthorized) =
            monadIRC.getSession(smartAccount);

        assertEq(storedKey, newSessionKey);
        assertEq(storedExpiry, expiry2);
        assertTrue(isAuthorized);
    }

    function testFuzz_AuthorizeSession(address _sessionKey, uint256 _expiryOffset) public {
        vm.assume(_sessionKey != address(0));
        _expiryOffset = bound(_expiryOffset, 1, 3650 days); // 1 sec to 10 years

        uint256 expiry = block.timestamp + _expiryOffset;

        vm.prank(smartAccount);
        monadIRC.authorizeSession(_sessionKey, expiry);

        assertTrue(monadIRC.isSessionValid(smartAccount));
    }

    /*//////////////////////////////////////////////////////////////
                        SESSION REVOCATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RevokeSession() public {
        // First authorize a session
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // Then revoke it
        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit SessionRevoked(smartAccount, sessionKey, block.timestamp);

        monadIRC.revokeSession();

        // Verify session is no longer valid
        (,, bool isAuthorized) = monadIRC.getSession(smartAccount);
        assertFalse(isAuthorized);
        assertFalse(monadIRC.isSessionValid(smartAccount));
    }

    function test_RevertWhen_RevokeNonExistentSession() public {
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.NoActiveSession.selector);
        monadIRC.revokeSession();
    }

    function test_RevertWhen_RevokeAlreadyRevokedSession() public {
        // Authorize and revoke
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.revokeSession();

        // Try to revoke again
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.NoActiveSession.selector);
        monadIRC.revokeSession();
    }

    /*//////////////////////////////////////////////////////////////
                        SESSION VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IsSessionValid_ExpiredSession() public {
        uint256 expiry = block.timestamp + 100;

        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // Session should be valid now
        assertTrue(monadIRC.isSessionValid(smartAccount));

        // Warp to after expiry
        vm.warp(expiry + 1);

        // Session should be invalid now
        assertFalse(monadIRC.isSessionValid(smartAccount));
    }

    function test_IsSessionValid_NonExistentSession() public {
        assertFalse(monadIRC.isSessionValid(smartAccount));
    }

    /*//////////////////////////////////////////////////////////////
                        CHANNEL CREATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateChannel() public {
        vm.prank(smartAccount);
        vm.expectEmit(false, true, false, true);
        emit ChannelCreated(TEST_CHANNEL, smartAccount, block.timestamp);

        monadIRC.createChannel(TEST_CHANNEL);

        // Verify channel was created
        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
    }

    function test_RevertWhen_CreateChannelWithShortName() public {
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannel("#");
    }

    function test_RevertWhen_CreateChannelWithEmptyName() public {
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannel("");
    }

    function test_RevertWhen_CreateDuplicateChannel() public {
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        vm.prank(user2);
        vm.expectRevert(MonadIRC.ChannelAlreadyExists.selector);
        monadIRC.createChannel(TEST_CHANNEL);
    }

    function test_CreateMultipleChannels() public {
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        vm.prank(user2);
        monadIRC.createChannel(TEST_CHANNEL_2);

        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertTrue(monadIRC.channelExists(TEST_CHANNEL_2));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
        assertEq(monadIRC.channelCreators(TEST_CHANNEL_2), user2);
    }

    function testFuzz_CreateChannel(string memory channelName) public {
        vm.assume(bytes(channelName).length > 1);
        vm.assume(bytes(channelName).length < 100); // Reasonable limit

        vm.prank(smartAccount);
        monadIRC.createChannel(channelName);

        assertTrue(monadIRC.channelExists(channelName));
        assertEq(monadIRC.channelCreators(channelName), smartAccount);
    }

    /*//////////////////////////////////////////////////////////////
                        MESSAGE SENDING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SendMessageSigned() public {
        // Setup: authorize session and create channel
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Prepare message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        // Create signature
        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Send message
        vm.expectEmit(true, true, false, true);
        emit MessageSent(msgHash, sessionKey, TEST_CHANNEL, block.timestamp);

        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );

        // Verify message was processed
        assertTrue(monadIRC.processedMessages(msgHash));
        assertEq(monadIRC.getNonce(smartAccount), nonce + 1);
    }

    function test_RevertWhen_SendMessageToNonExistentChannel() public {
        // Setup: authorize session but don't create channel
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.ChannelDoesNotExist.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendDuplicateMessage() public {
        // Setup
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Send first message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );

        // Try to send same message again (will fail due to duplicate msgHash, checked before nonce)
        vm.expectRevert(MonadIRC.MessageAlreadyProcessed.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendMessageWithInvalidSession() public {
        // Create channel but don't authorize session
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.SessionInvalidOrExpired.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendMessageWithInvalidNonce() public {
        // Setup
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 wrongNonce = 999;
        uint256 timestamp = block.timestamp;

        bytes32 messageHash = keccak256(
            abi.encodePacked(msgHash, TEST_CHANNEL, wrongNonce, timestamp, smartAccount)
        );
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.InvalidNonce.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, wrongNonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendMessageWithFutureTimestamp() public {
        // Setup
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp + 400; // More than MAX_TIMESTAMP_DRIFT

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.TimestampTooFarInFuture.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendMessageWithOldTimestamp() public {
        // Setup - warp to future to avoid underflow
        vm.warp(1000);
        
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp - 400; // More than MAX_TIMESTAMP_DRIFT

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.TimestampTooOld.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_RevertWhen_SendMessageWithInvalidSignature() public {
        // Setup
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        // Use wrong private key to sign
        uint256 wrongPrivateKey = 0x9999;
        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(MonadIRC.InvalidSignature.selector);
        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );
    }

    function test_SendMultipleMessages() public {
        // Setup
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Send 3 messages
        for (uint256 i = 0; i < 3; i++) {
            bytes32 msgHash = keccak256(abi.encodePacked("Message ", i));
            uint256 nonce = monadIRC.getNonce(smartAccount);
            uint256 timestamp = block.timestamp;

            bytes32 messageHash = keccak256(
                abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount)
            );
            bytes32 ethSignedMessageHash =
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
            bytes memory signature = abi.encodePacked(r, s, v);

            monadIRC.sendMessageSigned(
                msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
            );

            assertEq(monadIRC.getNonce(smartAccount), i + 1);
            assertTrue(monadIRC.processedMessages(msgHash));
        }
    }

    /*//////////////////////////////////////////////////////////////
                        GETTER FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetSession() public {
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        (address key, uint256 exp, bool auth) = monadIRC.getSession(smartAccount);

        assertEq(key, sessionKey);
        assertEq(exp, expiry);
        assertTrue(auth);
    }

    function test_GetSession_NonExistent() public {
        (address key, uint256 exp, bool auth) = monadIRC.getSession(smartAccount);

        assertEq(key, address(0));
        assertEq(exp, 0);
        assertFalse(auth);
    }

    function test_GetNonce() public {
        // Initial nonce should be 0
        assertEq(monadIRC.getNonce(smartAccount), 0);

        // After sending a message, nonce should increment
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );

        assertEq(monadIRC.getNonce(smartAccount), 1);
    }

    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FullWorkflow() public {
        // 1. Authorize session
        uint256 expiry = block.timestamp + EXPIRY_FUTURE;
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, expiry);

        // 2. Create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // 3. Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad IRC!"));
        uint256 nonce = monadIRC.getNonce(smartAccount);
        uint256 timestamp = block.timestamp;

        bytes32 messageHash =
            keccak256(abi.encodePacked(msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount));
        bytes32 ethSignedMessageHash =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        monadIRC.sendMessageSigned(
            msgHash, TEST_CHANNEL, nonce, timestamp, smartAccount, signature
        );

        // 4. Verify everything worked
        assertTrue(monadIRC.isSessionValid(smartAccount));
        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertTrue(monadIRC.processedMessages(msgHash));
        assertEq(monadIRC.getNonce(smartAccount), 1);
    }

    function test_MultiUserWorkflow() public {
        // User 1: Authorize and create channel
        vm.prank(smartAccount);
        monadIRC.authorizeSession(sessionKey, block.timestamp + EXPIRY_FUTURE);

        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // User 2: Authorize session
        uint256 user2PrivateKey = 0x4321;
        address user2SessionKey = vm.addr(user2PrivateKey);

        vm.prank(user2);
        monadIRC.authorizeSession(user2SessionKey, block.timestamp + EXPIRY_FUTURE);

        // User 1 sends message
        {
            bytes32 msgHash1 = keccak256(abi.encodePacked("Hello from user1"));
            bytes32 messageHash1 = keccak256(
                abi.encodePacked(
                    msgHash1, TEST_CHANNEL, monadIRC.getNonce(smartAccount), block.timestamp, smartAccount
                )
            );
            bytes32 ethSignedMessageHash1 =
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash1));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionPrivateKey, ethSignedMessageHash1);

            monadIRC.sendMessageSigned(
                msgHash1, TEST_CHANNEL, 0, block.timestamp, smartAccount, abi.encodePacked(r, s, v)
            );
            assertTrue(monadIRC.processedMessages(msgHash1));
        }

        // User 2 sends message
        {
            bytes32 msgHash2 = keccak256(abi.encodePacked("Hello from user2"));
            bytes32 messageHash2 = keccak256(
                abi.encodePacked(
                    msgHash2, TEST_CHANNEL, monadIRC.getNonce(user2), block.timestamp, user2
                )
            );
            bytes32 ethSignedMessageHash2 =
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash2));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(user2PrivateKey, ethSignedMessageHash2);

            monadIRC.sendMessageSigned(
                msgHash2, TEST_CHANNEL, 0, block.timestamp, user2, abi.encodePacked(r, s, v)
            );
            assertTrue(monadIRC.processedMessages(msgHash2));
        }

        // Verify final state
        assertEq(monadIRC.getNonce(smartAccount), 1);
        assertEq(monadIRC.getNonce(user2), 1);
    }
}

