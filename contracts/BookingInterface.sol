pragma solidity ^0.8.9;

interface BookingInterface {
    function addAmenitiesToRoom(
        uint roomIndex,
        uint[] memory amenities
    ) external;

    function getImplementationAddress() external view returns (address);
}
