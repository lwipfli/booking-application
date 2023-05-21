pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "./OracleHelperInterface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./BookingInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/OwnableInterface.sol";

contract BookingContract is BookingInterface, Initializable {
    using PRBMathSD59x18 for int256;
    // Events
    event RoomPosted(
        uint indexed roomIndex,
        address indexed owner,
        uint pricePerDay,
        int256 latitude,
        int256 longitude,
        string uri
    );
    event RoomUpdated(
        uint indexed roomIndex,
        uint pricePerDay,
        uint searchRadius,
        string uri
    );

    event RoomAmenities(uint indexed roomIndex, string amenities);

    event RoomBookabeUpdate(uint indexed roomIndex, bool bookable);
    event RoomBooked(
        uint indexed roomIndex,
        address indexed booker,
        uint startTime,
        uint endTime
    );
    event RoomCheckedIn(uint indexed roomIndex, address indexed booker);
    event RoomCheckedOut(uint indexed roomIndex, address indexed booker);

    // Modifiers

    modifier roomIndexCheck(uint roomIndex) {
        require((rooms.length > roomIndex) && (roomIndex >= 0));
        _;
    }

    modifier onlyOwner() {
        require((tx.origin == owner));
        _;
    }

    //Storage
    address private owner;
    address private helper;

    Room[] public rooms;

    mapping(address => uint[]) public roomsCreatedByOwners;
    mapping(address => uint) private pendingWithdrawals;

    uint private distanceSearchRadius;

    function initialize() public initializer {
        owner = tx.origin;
        distanceSearchRadius = 500;
    }

    /*
    constructor() {
        owner = msg.sender;
        distanceSearchRadius = 500;
    }
    */

    function changeOwnerOfHelper(address newOwner) public onlyOwner {
        OwnableInterface(helper).transferOwnership(newOwner);
    }

    function acceptOwnershipOfHelper() public onlyOwner {
        OwnableInterface(helper).acceptOwnership();
    }

    function getOwner() public view returns (address) {
        return owner;
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

    function setHelper(address newHelper) public onlyOwner {
        helper = newHelper;
    }

    function getHelper() public view onlyOwner returns (address) {
        return helper;
    }

    function postRoom(
        int256 latitude,
        int256 longitude,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice
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
        idx = createRoom(
            latitude,
            longitude,
            pricePerDay,
            uri,
            searchRadius,
            adaptPrice
        );
        // Add unique ID to room.
        addRoomIndex(msg.sender, idx);

        emit RoomPosted(idx, msg.sender, pricePerDay, latitude, longitude, uri);
    }

    function addRoomIndex(address roomOwner, uint roomIndex) internal {
        roomsCreatedByOwners[roomOwner].push(roomIndex);
    }

    function convertInt256ToString(
        int256 value
    ) public pure returns (string memory) {
        return BookingLib.convertInt256ToString(value);
    }

    function updateAmenities(uint roomIndex) public returns (bool) {
        Room storage room = rooms[roomIndex];
        require(room.owner == msg.sender);
        // Send helper request

        OracleHelper(helper).callMapForRoom(
            msg.sender,
            BookingLib.convertInt256ToString(
                rooms[roomIndex].position.latitude
            ),
            BookingLib.convertInt256ToString(
                rooms[roomIndex].position.longitude
            ),
            Strings.toString(rooms[roomIndex].searchRadius),
            roomIndex
        );

        return true;
    }

    function addAmenitiesToRoom(
        uint roomIndex,
        uint[] memory amenities
    ) external {
        Room storage room = rooms[roomIndex];
        require(msg.sender == helper);
        require(amenities.length <= uint(Amenity.LAST));
        //delete room.amenities;
        room.amenities = BookingLib.getAmenities(amenities);
        // Add new Amenities
        emit RoomAmenities(
            roomIndex,
            BookingLib.turnAmentitesIntoString(room.amenities)
        );
    }

    function createRoom(
        int256 latitude,
        int256 longitude,
        uint pricePerDay,
        string calldata uri,
        uint searchRadius,
        bool adaptPrice
    ) internal returns (uint) {
        uint idx = rooms.length;
        rooms.push();
        Amenity[] memory amenities;
        Position memory position;

        Room storage room = rooms[idx];

        room.bookable = true;
        room.uri = uri;
        room.searchRadius = searchRadius;

        //Hanlde price adaption
        if (adaptPrice) {
            uint averagePrice = averagePriceToSurrounding(
                latitude,
                longitude,
                searchRadius
            );
            uint fractal;
            if (averagePrice == 0) {
                fractal = 1;
            } else {
                fractal = 2;
            }
            room.pricePerDay = (pricePerDay + averagePrice) / fractal;
        } else {
            room.pricePerDay = pricePerDay;
        }
        room.amenities = amenities;

        room.owner = msg.sender;
        position.latitude = latitude;
        position.longitude = longitude;
        room.position = position;
        return idx;
    }

    function bookRoom(
        uint roomIndex,
        uint timestamp,
        uint numberOfDays
    ) public payable roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(room.bookable);
        require(numberOfDays > 0);
        require(msg.value >= (room.pricePerDay * numberOfDays));

        uint endTime = timestamp + (numberOfDays * 86400);
        require(!(overlapsCurrentBookings(roomIndex, timestamp, endTime)));
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

    function getAmenitiesOfRoom(
        uint roomIndex
    ) public view returns (string memory) {
        return BookingLib.turnAmentitesIntoString(rooms[roomIndex].amenities);
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
        uint searchRadius
    ) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(room.owner == msg.sender);

        room.pricePerDay = pricePerDay;

        room.uri = uri;
        room.searchRadius = searchRadius;

        emit RoomUpdated(roomIndex, pricePerDay, searchRadius, uri);
    }

    function setRoomBookale(
        uint roomIndex,
        bool bookable
    ) public roomIndexCheck(roomIndex) {
        Room storage room = rooms[roomIndex];
        require(room.owner == msg.sender);
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
        for (uint i = 0; i < rooms.length; i++) {
            Room memory room = rooms[i];
            if (
                uint(
                    BookingLib.computeDistanceHaversine(
                        latitude,
                        longitude,
                        room.position.latitude,
                        room.position.longitude
                    )
                ) <= distance
            ) {
                number++;
                price += room.pricePerDay;
            }
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
        uint maxNumber
    ) public view returns (uint[] memory roomIndices) {
        uint[] memory indexes = new uint[](maxNumber);
        uint fill = 0;
        for (uint i = 0; i < rooms.length; i++) {
            if (fill == maxNumber) {
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
        require(found);
        require(!(roomHasOccupant(roomIndex)));
        require(msg.value >= (room.pricePerDay / uint(2)));
        require(
            (block.timestamp >= room.bookings[bookingIndex].startTime) &&
                (block.timestamp <= room.bookings[bookingIndex].endTime)
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
        require(found);
        require(room.bookings[bookingIndex].checkedIn);
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
        require(room.owner == msg.sender);
        require(room.bookings.length > bookingIndex);
        require(room.bookings[bookingIndex].checkedIn);
        // Booking must have expired for at least half a day.
        require(
            (room.bookings[bookingIndex].endTime + 43200) <= block.timestamp
        );
        room.bookings[bookingIndex].checkedIn = false;
        uint depotAmount = room.bookings[bookingIndex].depot;
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
        for (uint i = 0; i < room.bookings.length; i++) {
            if (room.bookings[i].checkedIn) {
                return (true, room.bookings[i].booker);
            }
        }
        return (false, address(0));
    }

    function getImplementationAddress() external view returns (address) {
        return address(this);
    }
}
