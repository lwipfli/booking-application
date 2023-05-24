pragma solidity ^0.8.9;

import "./RoomBooking.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "./OracleHelperInterface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./BookingInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/OwnableInterface.sol";

/// @title POC Room booking contract
/// @author Lorenzo Wipfli
/// @notice This contract can be used to post rooms for booking and book them, in addition to using a
/// Chainlink oracle for amenity information. This contract is a proof-of-concept.
contract BookingContract is BookingInterface, Initializable {
    using PRBMathSD59x18 for int256;

    /// EVENTS ///

    /// @notice Indicates the posting of a room.
    /// @param roomIndex Index of the room.
    /// @param owner Address of the room owner.
    /// @param pricePerDay Price per day for booking.
    /// @param latitude Latitude value from -90 to 90 times 10^18.
    /// @param longitude Longitude value from -180 to 180 times 10^18.
    /// @param uri URI string for further room information.
    /// @param searchDistance Distance radius for price adaption and amenity search.
    event RoomPosted(
        uint indexed roomIndex,
        address indexed owner,
        uint pricePerDay,
        int256 latitude,
        int256 longitude,
        string uri,
        uint searchDistance
    );

    /// @notice Indicates updated room offer.
    /// @param roomIndex Index of the room.
    /// @param pricePerDay Updated room price per day for booking.
    /// @param searchRadius Updated search radius for price adaption and amenity search.
    /// @param uri Updated URI string for further room information.
    event RoomUpdated(
        uint indexed roomIndex,
        uint pricePerDay,
        uint searchRadius,
        string uri
    );

    /// @notice Indicates new room amenities available in surrounding.
    /// @param roomIndex Index of the room.
    /// @param amenities Amenities string description of room.
    event RoomAmenities(uint indexed roomIndex, string amenities);

    /// @notice Indicates Changes to specific room bookability.
    /// @param roomIndex Index of the room.
    /// @param bookable Truth value of room bookability.
    event RoomBookableUpdate(uint indexed roomIndex, bool bookable);

    /// @notice Indicates that a room has been booked for a certain time.
    /// @param roomIndex Index of the room.
    /// @param booker Address of the booker.
    /// @param startTime Start time of booking in unix time.
    /// @param endTime End time of booking in unix time.
    event RoomBooked(
        uint indexed roomIndex,
        address indexed booker,
        uint startTime,
        uint endTime
    );

    /// @notice Indicates that a room has been checked in by booker.
    /// @param roomIndex Index of the room.
    /// @param booker Address of the booker.
    event RoomCheckedIn(uint indexed roomIndex, address indexed booker);

    /// @notice Indicates that a room has been checked out by booker.
    /// @param roomIndex Index of the room.
    /// @param booker Address of the booker.
    event RoomCheckedOut(uint indexed roomIndex, address indexed booker);

    /// MODIFIERS ///

    /// @dev Checks that requested room by index does exist by checking if the index is possible.
    modifier roomIndexCheck(uint roomIndex) {
        require((rooms.length > roomIndex) && (roomIndex >= 0));
        _;
    }

    /// @dev Checks if the transaction origin is the owner of the booking contract.
    modifier onlyOwner() {
        require((tx.origin == owner));
        _;
    }

    /// STORAGE ///

    address private owner;
    address private helper;

    Room[] public rooms;

    mapping(address => uint[]) public roomsCreatedByOwners;
    mapping(address => uint) private pendingWithdrawals;


    /// @dev Initializer function for OpenZeppeling upgrades
    function initialize() public initializer {
        owner = tx.origin;
    }

    /// @notice Start change ownership of oracle helper contract.
    /// @dev Should be used when only main contract is upgraded so that helper can still be used by new contract.
    /// @param newOwner New owner address of booking contract
    function changeOwnerOfHelper(address newOwner) public onlyOwner {
        OwnableInterface(helper).transferOwnership(newOwner);
    }

    /// @notice Accept ownership of oracle helper contract if proposed.
    /// @dev Should be sued when only main contract is upgraded so that helper can still be used by new contract.
    function acceptOwnershipOfHelper() public onlyOwner {
        OwnableInterface(helper).acceptOwnership();
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getNumberOfRooms() public view returns (uint) {
        return rooms.length;
    }

    /// @notice Gives the room indices of the respective owner.
    /// @param ownerOfRoom Address of room owner.
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

    /// @notice Post room to contract with sender as owner.
    /// @dev 
    /// - Latitude must be between -90 and 90 times 10^18
    /// - Longitude must be between -180 and 180 times 10^18
    /// - Price per day must be positive
    /// - If the price should be adapted, then the room price will be:  (initial_price + average_price)/2.
    ///   If there are no surrounding rooms, then the price will not be adapted.
    ///
    /// Emits RoomPosted event
    ///
    /// @param latitude Latitude value of new room.
    /// @param longitude Longitude value of new room.
    /// @param pricePerDay Price per day for booking the room.
    /// @param uri URI of new room for more infromation.
    /// @param searchRadius Search radius value for amenity search and price adaption.
    /// @param adaptPrice Bool value if the price should be adapted to sourounding.
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

        emit RoomPosted(idx, msg.sender, pricePerDay, latitude, longitude, uri, searchRadius);
    }

    function addRoomIndex(address roomOwner, uint roomIndex) internal {
        roomsCreatedByOwners[roomOwner].push(roomIndex);
    }

    /// @notice Converts an integer value into a floating string with 18 floating points
    /// @param value Integer value in the form of PRBMathSD59x18
    function convertInt256ToString(
        int256 value
    ) public pure returns (string memory) {
        return BookingLib.convertInt256ToString(value);
    }

    /// @notice Make an oracle request to search for amenities.
    /// @param roomIndex Index of the room that should be updated.
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
        emit RoomBookableUpdate(roomIndex, bookable);
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
