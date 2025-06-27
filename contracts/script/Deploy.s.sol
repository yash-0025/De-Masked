// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import 'forge-std/Script.sol';
import {DeMaskedToken} from "../src/DeMaskedToken.sol";
import {DeMaskedCore} from "../src/DeMaskedCore.sol";


contract DeployScript is Script {
    function run() public returns (DeMaskedToken deMaskedToken, DeMaskedCore deMaskedCore) {
        string memory deployerPrivateKeyHX = string.concat("0x", vm.envString("PRIVATE_KEY"));
        uint256 deployerPrivateKey = vm.parseUint(deployerPrivateKeyHX);

        vm.startBroadcast(deployerPrivateKey);

        deMaskedToken = new DeMaskedToken();
        console.log("DeMasked Token deployed at :: ", address(deMaskedToken));

        deMaskedCore = new DeMaskedCore(address(deMaskedToken));
        console.log("DeMasked Core deployed at :: ", address(deMaskedCore));

        vm.stopBroadcast();
    }
}