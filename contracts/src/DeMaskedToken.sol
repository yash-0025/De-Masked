// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DeMaskedToken is ERC20, Ownable {

    constructor() ERC20("DeMasked Token", "DMT") Ownable(msg.sender) {
        _mint(msg.sender, 100_000_000 * 10 ** decimals()); // 100 million DMT mints
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to,amount);
    }
}

