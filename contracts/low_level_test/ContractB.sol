pragma solidity ^0.8.15;

import "./ContractA.sol";

contract ContractB {
    address private counterAddress;
    bytes4 public selector;

    constructor(address contractAddress) public {
        counterAddress = contractAddress;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function deposit() public payable {}

    function incrementOne(
        uint256 incrementValue,
        bytes4 selector
    ) public returns (bool) {
        bool success = false;
        (success, ) = counterAddress.call{gas: 10000000000}(
            abi.encodeWithSelector(selector, incrementValue)
        );
        require(success, "Contract A should have been incremented");
    }

    function incrementTwo(
        uint incrementValue,
        bytes4 selector
    ) public returns (bool) {
        bool success = false;
        (success, ) = counterAddress.call{gas: 10000000000}(
            abi.encodeWithSelector(selector, incrementValue, incrementValue)
        );
        require(success, "Contract A should have been incremented");
    }

    function getAddress() public view returns (address) {
        return counterAddress;
    }
}
