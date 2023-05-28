pragma solidity ^0.8.9;

interface OracleHelper {
    event OracleRequest(
        bytes32 indexed requestId,
        address indexed invoker,
        string latitude,
        string longitude,
        string distance,
        address indexed oracle
    );

    event OracleResponse(
        bytes32 indexed requestId,
        address indexed oracle,
        uint indexed roomIndex,
        uint256[] response
    );

    function getVersionNumber() external view returns (uint);

    function callMapForRoom(
        address origin,
        string calldata latitude,
        string calldata longitude,
        string calldata distance,
        uint roomIndex
    ) external;
}
