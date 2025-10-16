// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MonadIRC.sol";

/**
 * @title Deploy
 * @notice Foundry script to deploy MonadIRC contract
 * @dev Run with: forge script script/Deploy.s.sol:Deploy --rpc-url <RPC_URL> --broadcast
 */
contract Deploy is Script {
    function run() external returns (MonadIRC) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MonadIRC monadIRC = new MonadIRC();

        console.log("MonadIRC deployed to:", address(monadIRC));
        console.log("\nAdd this to your .env file:");
        console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=%s", address(monadIRC));

        vm.stopBroadcast();

        return monadIRC;
    }
}

