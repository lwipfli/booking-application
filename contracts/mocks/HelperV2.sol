pragma solidity ^0.8.9;

import "./HelperV1.sol";

contract HelperV2 is HelperV1 {
    constructor(
        address parentContract,
        address linkTokenAddress,
        address oracleAddress
    ) HelperV1(parentContract, linkTokenAddress, oracleAddress) {
        versionNumber = 2;
    }
}
