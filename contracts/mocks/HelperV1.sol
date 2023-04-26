pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

// Adapted from https://docs.chain.link/any-api/get-request/examples/multi-variable-responses/

contract HelperV1 is OracleHelper, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    bytes32 private jobId;
    uint256 private fee;

    event RequestMultipleFulfilled(
        bytes32 indexed requestId,
        uint256 btc,
        uint256 usd,
        uint256 eur
    );

    uint private versionNumber;

    constructor() ConfirmedOwner(msg.sender) {
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

    function getVersionNumber() external view returns (uint) {
        return versionNumber;
    }
}
