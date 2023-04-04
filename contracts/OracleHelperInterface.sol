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
        string response,
        uint responseTime
    );

    function callMapForRoom(
        string calldata latitude,
        string calldata longitude
    ) external view returns (uint[] memory);
}
