pragma solidity ^0.8.9;

interface OracleHelper {

    event CallAPIWithOracle(address indexed invoker, string request, address indexed oracle, uint invocationTime);

    event OracleResponse(address indexed oracle, string response, uint responseTime);
    
    function callMapForRoom(int128 latitude, int128 longitude) external view returns(string);

}