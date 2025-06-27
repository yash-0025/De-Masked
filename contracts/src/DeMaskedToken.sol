// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DeMaskedToken is ERC20, Ownable {

    uint256 public ethToDmtRate;

    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 dmtAmount);
    event EthToDmtRateUpdated(uint256 newRate);


    constructor() ERC20("DeMasked Token", "DMT") Ownable(msg.sender) {
        _mint(msg.sender, 100_000_000 * 10 ** decimals()); // 100 million DMT mints
        ethToDmtRate = 100_000 * 10**decimals();
        emit EthToDmtRateUpdated(ethToDmtRate);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Must send Ether to buy tokens");
        require(ethToDmtRate > 0, "Token purchase is currently diabled or rate is zero");

        uint256 dmtToMint = (msg.value * ethToDmtRate) / 10**18;
        require(dmtToMint > 0, "Calculated DMT amount is zero");

        _mint(msg.sender, dmtToMint);
        emit TokensPurchased(msg.sender, msg.value, dmtToMint);
    }

    function setEthToDmtRate(uint256 _newRate) public onlyOwner {
        ethToDmtRate = _newRate;
        emit EthToDmtRateUpdated(_newRate);
    }

    function withdrawEth() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No Ether to withdraw");
        (bool success,) = owner().call{value: balance}("");
        require(success, "Ether withdrawal failed");
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to,amount);
    }
}

