pragma solidity ^0.8.9;

import "./RoomBooking.sol";

contract BookingContract {

    address public owner;

    Room[] public rooms;


    mapping(address => uint[]) public roomsOfOwners;

    /**
     * Contract initialization.
     */
    constructor() {
        owner = msg.sender;
    }

    function getNumberOfRooms() public view returns (uint) {
        return rooms.length;
    }

    function postRoom(int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, uint pricePerDay, string calldata uri, uint searchRadius, bool searchSurroundings ) external {

        // Room posting requires workaround due to structs using structs and mapping.
        uint256 idx = rooms.length;
        rooms.push();

        Room storage room = rooms[idx];
        room.latitudeInteger = latitude;
        room.latitudeDecimals = latitudeDecimals;
        room.longitude = longitude;
        room.longitudeDecimals = longitudeDecimals;
        room.owner = msg.sender;
        room.pricePerDay = pricePerDay;
        room.uri = uri;
        room.searchRadius = searchRadius;
        room.numberOfBookings=0;
    }

}