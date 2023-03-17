pragma solidity ^0.8.9;

enum Amenity {
    RESTAURANT,
    CAFE
}

struct Room {
    address owner;
    //bytes32 id;
    Position position;
    uint searchRadius;
    bool bookable;
    uint pricePerDay;
    string uri;
    Amenity[] amenities;
    Booking[] bookings;
}

struct Booking {
    address booker;
    bool checkedIn;
    uint depot;
    /**
     * Timestamp in unix values
     */
    uint startTime;
    uint endTime;
}

struct Position {
    // Maximum precision for decimals should be 15.
    int latitudeInteger;
    uint latitudeDecimals;
    int longitude;
    uint longitudeDecimals;
}
