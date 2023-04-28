pragma solidity ^0.8.9;

interface OracleHelper {
    event CallAPIWithOracle(
        address indexed invoker,
        string request,
        address indexed oracle,
        uint invocationTime
    );

    event OracleResponse(
        address indexed oracle,
        uint[] response,
        uint responseTime
    );

    function getVersionNumber() external view returns (uint);

    function callMapForRoom(
        string calldata latitude,
        string calldata longitude,
        string calldata distance,
        uint roomIndex
    ) external;
}
