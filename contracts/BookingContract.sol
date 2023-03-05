pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BookingContract {

    // Events
    event RoomPosted(uint indexed roomIndex, address indexed owner, uint pricePerDay,int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, string amenities, string uri);

    address public owner;

    Room[] public rooms;

    mapping(address => uint[]) public roomsCreatedByOwners;

    /**
     * Contract initialization.
     */
    constructor() {
        owner = msg.sender;
    }

    function getNumberOfRooms() public view returns (uint) {
        return rooms.length;
    }

    function getRoomsByOwner(address ownerOfRoom) public view returns ( uint[] memory roomList){
    /*
    if(roomsCreatedByOwners[ownerOfRoom].length==0){
        uint[] memory a = new uint[](0);
        return a;
    }*/

        return roomsCreatedByOwners[ownerOfRoom];
    }

    function postRoom(int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, uint pricePerDay, string calldata uri, uint searchRadius, bool adaptPrice, bool searchSurroundings ) external {
        // Check if it is possible to create a new room.

        uint idx;
        string memory amenities;
        (idx,amenities) = createRoom(latitude, latitudeDecimals,longitude, longitudeDecimals, pricePerDay,uri, searchRadius, adaptPrice, searchSurroundings);
        // Add unique ID to room.
        addRoomIndex(msg.sender,idx);
        emit RoomPosted(idx,msg.sender,pricePerDay, latitude, latitudeDecimals, longitude,longitudeDecimals,  amenities,uri);
        
    }

    function addRoomIndex(address owner, uint roomIndex) internal {
        roomsCreatedByOwners[owner].push(roomIndex);
    }

    function createRoom(int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, uint pricePerDay, string calldata uri, uint searchRadius, bool adaptPrice, bool searchSurroundings) internal returns (uint, string memory){
        // Room posting requires workaround due to structs using structs and mapping.
        uint idx = rooms.length;
        rooms.push();
        string memory amenities = "None";

        Room storage room = rooms[idx];

        //uint roomsCreated = roomsCreatedByOwners[msg.sender].length -1;
        //bytes32 newId = keccak256(abi.encodePacked(msg.sender,roomsCreated));

        room.numberOfBookings=0;
        room.bookable=true;
        room.uri = uri;
        room.searchRadius = searchRadius;
        room.pricePerDay = pricePerDay;
        room.amenities = amenities;

        //room.id = newId;
        room.owner = msg.sender;
        room.latitudeInteger = latitude;
        room.latitudeDecimals = latitudeDecimals;
        room.longitude = longitude;
        room.longitudeDecimals = longitudeDecimals;
        return (idx, amenities);
    }

}