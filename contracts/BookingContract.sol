pragma solidity ^0.8.9;

import "./RoomBooking.sol";

contract BookingContract {

    address public owner;

    Room[] public rooms;

    uint public numberOfRooms;

    mapping(address => uint[]) public roomsOfOwners;

    /**
     * Contract initialization.
     */
    constructor() {
        owner = msg.sender;
        numberOfRooms=0;
    }

    function postRoom(int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, address roomOwner, uint pricePerDay, string calldata uri, uint searchRadius, bool searchSurroundings ) external {
        numberOfRooms++;
    }

}