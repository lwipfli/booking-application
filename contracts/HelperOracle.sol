pragma solidity ^0.8.9;

import "./OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

contract HelperOracle is OracleHelper, ChainlinkClient {

    uint private versionNumber;

    constructor() {
        versionNumber = 1;
    }

    function callMapForRoom(
        string calldata latitude,
        string calldata longitude,
        string calldata distance
    ) external view returns (uint[] memory) {
        uint[] memory result;
        return result;
    }

    function getVersionNumber() external view returns (uint){
        return versionNumber;
    }
}
