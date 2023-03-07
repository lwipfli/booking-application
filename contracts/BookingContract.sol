pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BookingContract {

    // Events
    event RoomPosted(uint indexed roomIndex, address indexed owner, uint pricePerDay,int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, string amenities, string uri);
    event RoomUpdated(uint indexed roomIndex, uint pricePerDay,uint searchRadius, string amenities, string uri);

    address public owner;

    Room[] public rooms;

    mapping(address => uint[]) public roomsCreatedByOwners;

    mapping (address => uint) public pendingWithdrawals;

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
        
        require((-90 <= latitude)&&(latitude<=90), "Latitude is not a value between -90 and 90.");
        require((0<=latitudeDecimals)&&(latitudeDecimals<=999999999999999), "Latitude precision is not of valid length. Only 15 decimal points are supported.");
        require((-180 <= longitude)&&(longitude<=180), "Longitude is not a value between -180 and 180.");
        require((0<=longitudeDecimals)&&(longitudeDecimals<=999999999999999), "Longitude precision is not of valid length. Only 15 decimal points are supported.");

        uint idx;
        string memory amenities;
        (idx,amenities) = createRoom(latitude, latitudeDecimals,longitude, longitudeDecimals, pricePerDay,uri, searchRadius, adaptPrice, searchSurroundings);
        // Add unique ID to room.
        addRoomIndex(msg.sender,idx);
        //TODO Adapt price

        // TODO Search surrounding
        emit RoomPosted(idx,msg.sender,pricePerDay, latitude, latitudeDecimals, longitude,longitudeDecimals, amenities,uri);
        
    }

    function addRoomIndex(address owner, uint roomIndex) internal {
        roomsCreatedByOwners[owner].push(roomIndex);
    }

    function convertLatLongToString (int value, uint decimals) public view returns (string memory){
        string memory prefix = "";
        int val = value;
        string memory decimalPadding = "";

        if(val<0){
            val = val * (-1);
            prefix = "-";
        }

        if((0<decimals)&&(decimals<10)){
            decimalPadding = "00000000000000";
        }
        else if(decimals<100){
            decimalPadding = "0000000000000";
        }
        else if(decimals<1000){
            decimalPadding = "000000000000";
        }
        else if(decimals<10000){
            decimalPadding = "00000000000";
        }
        else if(decimals<100000){
            decimalPadding = "0000000000";
        }
        else if(decimals<1000000){
            decimalPadding = "000000000";
        }
        else if(decimals<10000000){
            decimalPadding = "00000000";
        }
        else if(decimals<100000000){
            decimalPadding = "0000000";
        }
        else if(decimals<1000000000){
            decimalPadding = "000000";
        }
        else if(decimals<10000000000){
            decimalPadding = "00000";
        }
        else if(decimals<100000000000){
            decimalPadding = "0000";
        }
        else if(decimals<1000000000000){
            decimalPadding = "000";
        }
        else if(decimals<10000000000000){
            decimalPadding = "00";
        }
        else if(decimals<100000000000000){
            decimalPadding = "0";
        }
        return string(abi.encodePacked(prefix,Strings.toString(uint(val)),".",decimalPadding,Strings.toString(uint(decimals))));
    }


    function createRoom(int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, uint pricePerDay, string calldata uri, uint searchRadius, bool adaptPrice, bool searchSurroundings) internal returns (uint, string memory){
        // Room posting requires workaround due to structs using structs and mapping.
        uint idx = rooms.length;
        rooms.push();
        string memory amenities = "None";

        Room storage room = rooms[idx];

        //uint roomsCreated = roomsCreatedByOwners[msg.sender].length -1;
        //bytes32 newId = keccak256(abi.encodePacked(msg.sender,roomsCreated));

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

    function bookRoom(uint roomIndex, uint timestap, uint numberOfDays) public payable {
        Room storage room = rooms[roomIndex];
        require(room.bookable,"Room is not bookable at the current time.");
        //TODO

    }

    function addBooking(uint roomIndex, address booker, uint startTime, uint endTime) internal {
        Room storage room = rooms[roomIndex];
        uint bookingIdx = room.bookings.length;
        room.bookings.push();
        Booking storage booking = room.bookings[bookingIdx];
        booking.booker=booker;
        booking.startTime=startTime;
        booking.endTime=endTime;
        booking.checkedIn=false;
    }

    function overlapsCurrentBookings(uint roomIndex, uint startTimestamp, uint endTimestamp ) internal view returns (bool) {
        Room storage room = rooms[roomIndex];
        for(uint i = 0; i < room.bookings.length; i++){
            if((room.bookings[i].startTime<=endTimestamp)&&(room.bookings[i].endTime>=startTimestamp)){
                return true;
            }
        }
        return false;
    }

    function withdraw() external {
        uint amount = pendingWithdrawals[msg.sender];
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function updateRoom(uint roomIndex,uint pricePerDay, string calldata uri, uint searchRadius, bool adaptPrice, bool searchSurroundings) public {
        require((rooms.length>roomIndex)&&(roomIndex>=0), "Room index does not exist.");
        Room storage room = rooms[roomIndex];
        require(room.owner==msg.sender,"Owner is different from one updating.");
        room.pricePerDay=pricePerDay;
        room.uri=uri;
        room.searchRadius=searchRadius;
        
        //TODO Adapt price

        //TODO Search surrounding
        emit RoomUpdated(roomIndex, pricePerDay,searchRadius, room.amenities, uri);

    }

    function getRoom(uint roomIndex) view public returns (Room memory room){
        require(rooms.length>=roomIndex, "Room index does not exist.");
        return rooms[roomIndex];
    }
}