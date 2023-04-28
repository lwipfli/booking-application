pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

// Adapted from https://docs.chain.link/any-api/get-request/examples/multi-variable-responses/ and https://docs.chain.link/any-api/get-request/examples/array-response

contract HelperV1 is OracleHelper, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    bytes32 private jobId;
    uint256 private fee;

    event RequestFulfilled(bytes32 indexed requestId, uint256[] resultArray);

    uint private versionNumber;

    address public parentContract;

    modifier onlyParent() {
        require((msg.sender == parentContract));
        _;
    }

    constructor(
        address parentContract,
        address linkTokenAddress,
        address oracleAddress
    ) ConfirmedOwner(parentContract) {
        versionNumber = 1;
        setChainlinkToken(linkTokenAddress);
        setChainlinkOracle(oracleAddress);
        jobId = "JOBID";
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    function callMapForRoom(
        string calldata latitude,
        string calldata longitude,
        string calldata distance,
        uint roomIndex
    ) external {}

    function deliverMapResponse() internal returns (bool) {
        return true;
    }

    function getVersionNumber() external view returns (uint) {
        return versionNumber;
    }
}
