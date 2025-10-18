// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MonadIRC.sol";

contract MonadIRCTest is Test {
    MonadIRC public monadIRC;

    address public smartAccount;
    address public smartAccount2;

    string public constant TEST_CHANNEL = "#general";
    string public constant TEST_CHANNEL_2 = "#random";

    event ChannelCreated(
        string channelName,
        address indexed creator,
        uint256 timestamp
    );

    event MessageSent(
        bytes32 indexed msgHash,
        address indexed sender,
        string channel,
        uint256 timestamp
    );

    function setUp() public {
        monadIRC = new MonadIRC();

        // Setup test smart accounts
        smartAccount = makeAddr("smartAccount");
        smartAccount2 = makeAddr("smartAccount2");
    }

    /*//////////////////////////////////////////////////////////////
                    CHANNEL CREATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateChannel_Success() public {
        vm.prank(smartAccount);
        vm.expectEmit(false, true, false, true);
        emit ChannelCreated(TEST_CHANNEL, smartAccount, block.timestamp);

        monadIRC.createChannel(TEST_CHANNEL);

        // Verify channel exists
        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
    }

    function test_CreateChannel_RevertWhen_NameTooShort() public {
        string memory shortName = "#";
        
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannel(shortName);
    }

    function test_CreateChannel_RevertWhen_EmptyName() public {
        string memory emptyName = "";
        
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelNameTooShort.selector);
        monadIRC.createChannel(emptyName);
    }

    function test_CreateChannel_RevertWhen_DuplicateChannel() public {
        // Create first channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Try to create duplicate
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelAlreadyExists.selector);
        monadIRC.createChannel(TEST_CHANNEL);
    }

    function test_CreateChannel_DifferentSmartAccountsSameChannel() public {
        // User 1 creates channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // User 2 cannot create same channel
        vm.prank(smartAccount2);
        vm.expectRevert(MonadIRC.ChannelAlreadyExists.selector);
        monadIRC.createChannel(TEST_CHANNEL);
    }

    function test_CreateChannel_MultipleChannelsSameUser() public {
        // Create first channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Create second channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL_2);

        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertTrue(monadIRC.channelExists(TEST_CHANNEL_2));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
        assertEq(monadIRC.channelCreators(TEST_CHANNEL_2), smartAccount);
    }

    /*//////////////////////////////////////////////////////////////
                    MESSAGE SENDING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SendMessage_Success() public {
        // Setup: create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad!"));
        
        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit MessageSent(msgHash, smartAccount, TEST_CHANNEL, block.timestamp);
        
        monadIRC.sendMessage(msgHash, TEST_CHANNEL);
    }

    function test_SendMessage_RevertWhen_ChannelDoesNotExist() public {
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        
        vm.prank(smartAccount);
        vm.expectRevert(MonadIRC.ChannelDoesNotExist.selector);
        monadIRC.sendMessage(msgHash, TEST_CHANNEL);
    }

    function test_SendMessage_AllowDuplicateMessages() public {
        // Setup: create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Send first message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello!"));
        vm.prank(smartAccount);
        monadIRC.sendMessage(msgHash, TEST_CHANNEL);

        // Send same message again (should succeed - no replay protection)
        vm.prank(smartAccount);
        monadIRC.sendMessage(msgHash, TEST_CHANNEL);
    }

    function test_SendMessage_DifferentUsers() public {
        // User 1 creates channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // User 1 sends message
        bytes32 msg1Hash = keccak256(abi.encodePacked("Hello from user 1"));
        vm.prank(smartAccount);
        monadIRC.sendMessage(msg1Hash, TEST_CHANNEL);

        // User 2 sends message to same channel
        bytes32 msg2Hash = keccak256(abi.encodePacked("Hello from user 2"));
        vm.prank(smartAccount2);
        monadIRC.sendMessage(msg2Hash, TEST_CHANNEL);
    }

    function test_SendMultipleMessages() public {
        // Setup: create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // Send 5 messages
        for (uint256 i = 0; i < 5; i++) {
            bytes32 msgHash = keccak256(abi.encodePacked("Message ", i));
            
            vm.prank(smartAccount);
            monadIRC.sendMessage(msgHash, TEST_CHANNEL);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FullWorkflow() public {
        // 1. Create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // 2. Send message
        bytes32 msgHash = keccak256(abi.encodePacked("Hello Monad IRC!"));
        vm.prank(smartAccount);
        monadIRC.sendMessage(msgHash, TEST_CHANNEL);

        // 3. Verify everything
        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
    }

    function test_MultiUserWorkflow() public {
        // User 1: Create channel
        vm.prank(smartAccount);
        monadIRC.createChannel(TEST_CHANNEL);

        // User 2: Create different channel
        vm.prank(smartAccount2);
        monadIRC.createChannel(TEST_CHANNEL_2);

        // User 1 sends message to their channel
        bytes32 msg1Hash = keccak256(abi.encodePacked("Hello from user 1"));
        vm.prank(smartAccount);
        monadIRC.sendMessage(msg1Hash, TEST_CHANNEL);

        // User 2 sends message to their channel
        bytes32 msg2Hash = keccak256(abi.encodePacked("Hello from user 2"));
        vm.prank(smartAccount2);
        monadIRC.sendMessage(msg2Hash, TEST_CHANNEL_2);

        // User 2 sends message to User 1's channel
        bytes32 msg3Hash = keccak256(abi.encodePacked("User 2 in User 1's channel"));
        vm.prank(smartAccount2);
        monadIRC.sendMessage(msg3Hash, TEST_CHANNEL);

        // Verify
        assertTrue(monadIRC.channelExists(TEST_CHANNEL));
        assertTrue(monadIRC.channelExists(TEST_CHANNEL_2));
        assertEq(monadIRC.channelCreators(TEST_CHANNEL), smartAccount);
        assertEq(monadIRC.channelCreators(TEST_CHANNEL_2), smartAccount2);
    }
}
