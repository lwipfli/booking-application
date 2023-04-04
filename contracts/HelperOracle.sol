pragma solidity ^0.8.9;

import "./OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

contract HelperOracle is OracleHelper, ChainlinkClient {
    function callMapForRoom(
        string calldata latitude,
        string calldata longitude
    ) external view returns (uint[] memory) {
        uint[] memory result;
        return result;
    }
}
