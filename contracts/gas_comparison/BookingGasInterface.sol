pragma solidity ^0.8.9;

interface BookingGasInterface {
    function addAmenitiesToRoom(uint[] memory result) external;

    function getImplementationAddress() external view returns (address);
}
