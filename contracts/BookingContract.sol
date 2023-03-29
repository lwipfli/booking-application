pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";

contract BookingContract {
    using PRBMathSD59x18 for int256;
    // Events
    event RoomPosted(
        uint indexed roomIndex,
        address indexed owner,
        uint pricePerDay,
        int256 latitude,
        int256 longitude,
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

    modifier roomIndexCheck(uint roomIndex) {
        require(
            (rooms.length > roomIndex) && (roomIndex >= 0),
            "Room index does not exist."
        );
        _;
    }

    modifier onlyOwner() {
        require((msg.sender == owner));
        _;
    }

    address public owner;

    Room[] public rooms;

    mapping(address => uint[]) public roomsCreatedByOwners;
    mapping(address => uint) public pendingWithdrawals;

    uint public distanceSearchRadius;

    constructor() {
        owner = msg.sender;
        distanceSearchRadius = 500;
    }

    function updateSearchDistance(uint distance) public onlyOwner {
        distanceSearchRadius = distance;
    }

    function getSearchDistance() public view returns (uint) {
        return distanceSearchRadius;
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
        int256 latitude,
        int256 longitude,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice,
        bool searchSurroundings
    ) external {
        require(
            (-90000000000000000000 <= latitude) &&
                (latitude <= 90000000000000000000)
        );
        require(
            (-180000000000000000000 <= longitude) &&
                (longitude <= 180000000000000000000)
        );
        require(pricePerDay >= 0);

        uint idx;
        Amenity[] memory amenities;
        (idx, amenities) = createRoom(
            latitude,
            longitude,
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
            longitude,
            turnAmentitesIntoString(amenities),
            uri
        );
    }

    function addRoomIndex(address roomOwner, uint roomIndex) internal {
        roomsCreatedByOwners[roomOwner].push(roomIndex);
    }

    function convertInt256ToString(
        int256 value
    ) public pure returns (string memory) {
        return BookingLib.convertInt256ToString(value);
    }

    function createRoom(
        int256 latitude,
        int256 longitude,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice,
        bool searchSurroundings
    ) internal returns (uint, Amenity[] memory) {
        uint idx = rooms.length;
        rooms.push();
        Amenity[] memory amenities;
        Position memory position;

        Room storage room = rooms[idx];

        //TODO Hanlde price adaption

        //TODO handle oracle call

        room.bookable = true;
        room.uri = uri;
        room.searchRadius = searchRadius;
        room.pricePerDay = pricePerDay;
        room.amenities = amenities;

        room.owner = msg.sender;
        position.latitude = latitude;
        position.longitude = longitude;
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
        int256 latitude,
        int256 longitude,
        uint distance
    ) public view returns (uint averagedPrice) {
        uint number = 0;
        uint price = 0;
        for (uint i = 0; i > rooms.length; i++) {
            Room memory room = rooms[i];
            /*
            if (
                BookingLib.computeDistanceHaversine(
                    latitude,
                    longitude,
                    room.position.latitude,
                    room.position.longitude
                ) <= distance
            ) {
                number++;
                price += room.pricePerDay;
            }
            */
        }
        if (number == 0) {
            return 0;
        }
        return (price / number);
    }

    function searchForRooms(
        int256 latitude,
        int256 longitude,
        uint distance,
        uint range
    ) public view returns (uint[] memory roomIndices) {
        uint[] memory indexes = new uint[](range);
        uint fill = 0;
        for (uint i = 0; i < rooms.length; i++) {
            if (fill == range) {
                break;
            }
            Room memory room = rooms[i];
            if (
                (BookingLib.computeDistanceHaversine(
                    latitude,
                    longitude,
                    room.position.latitude,
                    room.position.longitude
                ) <= int(distance))
            ) {
                indexes[fill] = i;
                fill++;
            }
        }
        return indexes;
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
        require(msg.value >= (room.pricePerDay / uint(2)), "Not enough depot.");
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
}
