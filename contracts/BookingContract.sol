pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BookingContract {
    // Events
    event RoomPosted(
        uint indexed roomIndex,
        address indexed owner,
        uint pricePerDay,
        int latitude,
        uint latitudeDecimals,
        int longitude,
        uint longitudeDecimals,
        string amenities,
        string uri
    );
    event RoomUpdated(
        uint indexed roomIndex,
        uint pricePerDay,
        uint searchRadius,
        string amenities,
        string uri
    );
    event RoomBookabeUpdate(uint indexed roomIndex, bool bookable);
    event RoomBooked(
        uint indexed roomIndex,
        address indexed booker,
        uint startTime,
        uint endTime
    );
    event RoomCheckedIn(uint indexed roomIndex, address indexed booker);
    event RoomCheckedOut(uint indexed roomIndex, address indexed booker);

    //Modifiers
    modifier roomIndexCheck(uint roomIndex) {
        require(
            (rooms.length > roomIndex) && (roomIndex >= 0),
            "Room index does not exist."
        );
        _;
    }

    // 0.005 so it is at most 0,555 kilometers in either longitude or latitude
    uint public constant SURROUNDING_DISTANCE_FOR_PRICE_ADAPTION = 50000000000;

    address public owner;

    Room[] public rooms;
    //Mappings
    mapping(address => uint[]) public roomsCreatedByOwners;
    mapping(address => uint) public pendingWithdrawals;

    /**
     * Contract initialization.
     */
    constructor() {
        owner = msg.sender;
    }

    function getNumberOfRooms() public view returns (uint) {
        return rooms.length;
    }

    function getRoomsByOwner(
        address ownerOfRoom
    ) public view returns (uint[] memory roomList) {
        return roomsCreatedByOwners[ownerOfRoom];
    }

    function postRoom(
        int latitude,
        uint latitudeDecimals,
        int longitude,
        uint longitudeDecimals,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice,
        bool searchSurroundings
    ) external {
        // Check if it is possible to create a new room.

        require(
            (-90 <= latitude) && (latitude <= 90),
            "Latitude is not a value between -90 and 90."
        );
        require(
            (0 <= latitudeDecimals) && (latitudeDecimals <= 999999999999999),
            "Latitude precision is not of valid length. Only 15 decimal points are supported."
        );
        require(
            (-180 <= longitude) && (longitude <= 180),
            "Longitude is not a value between -180 and 180."
        );
        require(
            (0 <= longitudeDecimals) && (longitudeDecimals <= 999999999999999),
            "Longitude precision is not of valid length. Only 15 decimal points are supported."
        );
        require(pricePerDay >= 0, "Price should not be negative.");

        uint idx;
        Amenity[] memory amenities;
        (idx, amenities) = createRoom(
            latitude,
            latitudeDecimals,
            longitude,
            longitudeDecimals,
            pricePerDay,
            uri,
            searchRadius,
            adaptPrice,
            searchSurroundings
        );
        // Add unique ID to room.
        addRoomIndex(msg.sender, idx);
        //TODO Adapt price

        // TODO Search surrounding
        emit RoomPosted(
            idx,
            msg.sender,
            pricePerDay,
            latitude,
            latitudeDecimals,
            longitude,
            longitudeDecimals,
            turnAmentitesIntoString(amenities),
            uri
        );
    }

    function addRoomIndex(address roomOwner, uint roomIndex) internal {
        roomsCreatedByOwners[roomOwner].push(roomIndex);
    }

    function convertLatLongToString(
        int value,
        uint decimals
    ) public pure returns (string memory) {
        string memory prefix = "";
        int val = value;
        string memory decimalPadding = "";

        if (val < 0) {
            val = val * (-1);
            prefix = "-";
        }

        if ((0 < decimals) && (decimals < 10)) {
            decimalPadding = "00000000000000";
        } else if (decimals < 100) {
            decimalPadding = "0000000000000";
        } else if (decimals < 1000) {
            decimalPadding = "000000000000";
        } else if (decimals < 10000) {
            decimalPadding = "00000000000";
        } else if (decimals < 100000) {
            decimalPadding = "0000000000";
        } else if (decimals < 1000000) {
            decimalPadding = "000000000";
        } else if (decimals < 10000000) {
            decimalPadding = "00000000";
        } else if (decimals < 100000000) {
            decimalPadding = "0000000";
        } else if (decimals < 1000000000) {
            decimalPadding = "000000";
        } else if (decimals < 10000000000) {
            decimalPadding = "00000";
        } else if (decimals < 100000000000) {
            decimalPadding = "0000";
        } else if (decimals < 1000000000000) {
            decimalPadding = "000";
        } else if (decimals < 10000000000000) {
            decimalPadding = "00";
        } else if (decimals < 100000000000000) {
            decimalPadding = "0";
        }
        return
            string(
                abi.encodePacked(
                    prefix,
                    Strings.toString(uint(val)),
                    ".",
                    decimalPadding,
                    Strings.toString(uint(decimals))
                )
            );
    }

    function createRoom(
        int latitude,
        uint latitudeDecimals,
        int longitude,
        uint longitudeDecimals,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice,
        bool searchSurroundings
    ) internal returns (uint, Amenity[] memory) {
        // Room posting requires workaround due to structs using structs and mapping.
        uint idx = rooms.length;
        rooms.push();
        Amenity[] memory amenities;
        Position memory position;

        Room storage room = rooms[idx];

        //uint roomsCreated = roomsCreatedByOwners[msg.sender].length -1;
        //bytes32 newId = keccak256(abi.encodePacked(msg.sender,roomsCreated));

        //TODO Hanlde price adaption

        //TODO handle oracle call

        room.bookable = true;
        room.uri = uri;
        room.searchRadius = searchRadius;
        room.pricePerDay = pricePerDay;
        room.amenities = amenities;

        //room.id = newId;
        room.owner = msg.sender;
        position.latitudeInteger = latitude;
        position.latitudeDecimals = latitudeDecimals;
        position.longitude = longitude;
        position.longitudeDecimals = longitudeDecimals;
        room.position = position;
        return (idx, amenities);
    }

    function bookRoom(
        uint roomIndex,
        uint timestamp,
        uint numberOfDays
    ) public payable roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(room.bookable, "Room is not bookable at the current time.");
        require(numberOfDays > 0, "Cannot book room for zero days.");
        // TODO TEST FROM HERE
        require(
            msg.value >= (room.pricePerDay * numberOfDays),
            "Payment is not enough for room."
        );

        uint endTime = timestamp + (numberOfDays * 86400);
        require(
            !(overlapsCurrentBookings(roomIndex, timestamp, endTime)),
            "Room alredy booked at the time."
        );
        addBooking(roomIndex, msg.sender, timestamp, endTime);
        emit RoomBooked(roomIndex, msg.sender, timestamp, endTime);
        // Handle payment.
        pendingWithdrawals[room.owner] += msg.value;
    }

    function addBooking(
        uint roomIndex,
        address booker,
        uint startTime,
        uint endTime
    ) internal {
        Room storage room = rooms[roomIndex];
        uint bookingIdx = room.bookings.length;
        room.bookings.push();
        Booking storage booking = room.bookings[bookingIdx];
        booking.booker = booker;
        booking.startTime = startTime;
        booking.endTime = endTime;
        booking.checkedIn = false;
        booking.depot = 0;
    }

    function getBookings(
        uint roomIndex
    ) public view roomIndexCheck(roomIndex) returns (Booking[] memory) {
        return rooms[roomIndex].bookings;
    }

    function overlapsCurrentBookings(
        uint roomIndex,
        uint startTimestamp,
        uint endTimestamp
    ) internal view returns (bool) {
        Room storage room = rooms[roomIndex];
        for (uint i = 0; i < room.bookings.length; i++) {
            if (
                (room.bookings[i].startTime <= endTimestamp) &&
                (room.bookings[i].endTime >= startTimestamp)
            ) {
                return true;
            }
        }
        return false;
    }

    function withdraw() public {
        uint amount = pendingWithdrawals[msg.sender];
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function checkBalance() public view returns (uint) {
        return pendingWithdrawals[msg.sender];
    }

    function updateRoom(
        uint roomIndex,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice,
        bool searchSurroundings
    ) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(
            room.owner == msg.sender,
            "Owner is different from one updating."
        );
        room.pricePerDay = pricePerDay;
        room.uri = uri;
        room.searchRadius = searchRadius;

        //TODO Adapt price

        //TODO Search surrounding
        emit RoomUpdated(
            roomIndex,
            pricePerDay,
            searchRadius,
            turnAmentitesIntoString(room.amenities),
            uri
        );
    }

    function turnAmentitesIntoString(
        Amenity[] memory amenities
    ) internal view returns (string memory) {
        if (amenities.length == 0) {
            return "None";
        }
        string memory output;
        string memory placeholder;
        for (uint i = 0; i < amenities.length; i++) {
            if (amenities[i] == Amenity.RESTAURANT) {
                placeholder = "restaurant";
            }
            if (amenities[i] == Amenity.CAFE) {
                placeholder = "cafe";
            }
            if (i == 0) {
                output = placeholder;
            } else {
                output = string(abi.encodePacked(output, ", ", placeholder));
            }
        }
        return output;
    }

    function setRoomBookale(
        uint roomIndex,
        bool bookable
    ) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(
            room.owner == msg.sender,
            "Owner is different from one updating."
        );
        room.bookable = bookable;
        emit RoomBookabeUpdate(roomIndex, bookable);
    }

    function getRoom(
        uint roomIndex
    ) public view roomIndexCheck(roomIndex) returns (Room memory room) {
        return rooms[roomIndex];
    }

    function averagePriceToSurrounding(
        int startingLatitude,
        uint startingdecimals,
        int startingLongitude,
        uint startingLongitudeDecimals,
        uint originalPrice
    ) public view returns (uint averagedPrice) {
        //TODO
        /*
        uint numberOfRooms = 1;
        uint price = originalPrice;
        for(uint i = 0;i<rooms.length;i++){
            if(){

            }
        }
        */
    }

    function checkIn(uint roomIndex) public payable roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        uint bookingIndex;
        bool found;
        // Find correct booking
        (found, bookingIndex) = getBookingIndexOfOwner(room, msg.sender);
        require(found, "No booking for this owner.");
        require(
            !(roomHasOccupant(room)),
            "Room is already checked in by other occupant."
        );
        // Depot should be half of the day price.
        require(msg.value >= (room.pricePerDay / uint(2)), "Not enough depot.");
        // Must be in checkin window
        require(
            (block.timestamp >= room.bookings[bookingIndex].startTime) &&
                (block.timestamp <= room.bookings[bookingIndex].endTime),
            "Cannot checkin due to being outside checkin window."
        );
        room.bookings[bookingIndex].depot += msg.value;
        room.bookings[bookingIndex].checkedIn = true;
        emit RoomCheckedIn(roomIndex, msg.sender);
    }

    function checkOut(uint roomIndex) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        uint bookingIndex;
        bool found;
        uint depotAmount;
        // Find correct booking
        (found, bookingIndex) = getBookingIndexOfOwner(room, msg.sender);
        require(found, "No booking for this owner.");
        require(
            room.bookings[bookingIndex].checkedIn,
            "Room has not been checked in."
        );
        Booking[] storage roomBookings = room.bookings;
        roomBookings[bookingIndex].checkedIn = false;
        depotAmount = roomBookings[bookingIndex].depot;
        roomBookings[bookingIndex].depot = 0;
        pendingWithdrawals[msg.sender] += depotAmount;
        emit RoomCheckedOut(roomIndex, msg.sender);
        // Remove booking
        for (uint i = bookingIndex; i < roomBookings.length - 1; i++) {
            roomBookings[i] = roomBookings[i + 1];
        }
        roomBookings.pop();
    }

    function forceFullEviction(
        uint roomIndex,
        uint bookingIndex
    ) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(room.owner == msg.sender, "Not owner of room.");
        require(room.bookings.length > bookingIndex, "Booking does not exist.");
        require(room.bookings[bookingIndex].checkedIn, "Room is not occupied.");
        // Booking must have expired for at least half a day.
        require(
            (room.bookings[bookingIndex].endTime + 43200) <= block.timestamp,
            "Not enough time passed for eviction."
        );
        uint depotAmount;
        room.bookings[bookingIndex].checkedIn = false;
        depotAmount = room.bookings[bookingIndex].depot;
        room.bookings[bookingIndex].depot = 0;
        pendingWithdrawals[msg.sender] += depotAmount;
        emit RoomCheckedOut(roomIndex, room.bookings[bookingIndex].booker);
        // Remove booking
        for (uint i = bookingIndex; i < room.bookings.length - 1; i++) {
            room.bookings[i] = room.bookings[i + 1];
        }
        room.bookings.pop();
    }

    function getBookingIndexOfOwner(
        Room memory room,
        address owner
    ) internal pure returns (bool, uint) {
        for (uint i = 0; i < room.bookings.length; i++) {
            if (room.bookings[i].booker == owner) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    function roomHasOccupant(Room memory room) internal pure returns (bool) {
        for (uint i = 0; i < room.bookings.length; i++) {
            if (room.bookings[i].checkedIn) {
                return true;
            }
        }
        return false;
    }

    function roomHasOccupant(
        uint roomIndex
    ) internal view roomIndexCheck(roomIndex) returns (bool) {
        Room memory room = rooms[roomIndex];
        for (uint i = 0; i < room.bookings.length; i++) {
            if (room.bookings[i].checkedIn) {
                return true;
            }
        }
        return false;
    }

    function roomOccupant(
        uint roomIndex
    ) public view roomIndexCheck(roomIndex) returns (bool, address) {
        Room memory room = rooms[roomIndex];
        bool occupied = false;
        address occupant;
        for (uint i = 0; i < room.bookings.length; i++) {
            if (room.bookings[i].checkedIn) {
                occupant = room.bookings[i].booker;
                occupied = true;
            }
        }
        return (occupied, occupant);
    }

    function max(uint a, uint b) public pure returns (uint) {
        return a >= b ? a : b;
    }

    function max(int a, int b) public pure returns (int) {
        return a >= b ? a : b;
    }

    function min(uint a, uint b) public pure returns (uint) {
        return a <= b ? a : b;
    }

    function min(int a, int b) public pure returns (int) {
        return a <= b ? a : b;
    }
}
