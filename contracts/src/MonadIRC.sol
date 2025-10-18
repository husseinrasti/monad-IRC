// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MonadIRC
 * @notice Simplified decentralized IRC chat system for Account Abstraction
 * @dev Works with MetaMask Delegation Toolkit + Pimlico bundler
 */
contract MonadIRC {
    
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

    mapping(string => bool) public channelExists;
    mapping(string => address) public channelCreators;

    /* Errors */
    error ChannelNameTooShort();
    error ChannelAlreadyExists();
    error ChannelDoesNotExist();

    /**
     * @notice Create a new channel
     * @param channelName The name of the channel to create
     */
    function createChannel(string memory channelName) external {
        if (bytes(channelName).length <= 1) revert ChannelNameTooShort();
        if (channelExists[channelName]) revert ChannelAlreadyExists();

        channelExists[channelName] = true;
        channelCreators[channelName] = msg.sender;

        emit ChannelCreated(channelName, msg.sender, block.timestamp);
    }

    /**
     * @notice Send a message to a channel
     * @param msgHash Hash of the message content
     * @param channel Channel name to send to
     */
    function sendMessage(bytes32 msgHash, string memory channel) external {
        if (!channelExists[channel]) revert ChannelDoesNotExist();

        emit MessageSent(msgHash, msg.sender, channel, block.timestamp);
    }
}
