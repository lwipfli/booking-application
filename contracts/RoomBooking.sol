pragma solidity ^0.8.9;


enum Amenity {
    RESTAURANT
    }

struct Room {

    address owner;
    //bytes32 id;
    int latitudeInteger;
    uint latitudeDecimals;
    int longitude;
    uint longitudeDecimals;
    uint searchRadius;
    bool bookable;
    uint pricePerDay;
    string uri;
    string amenities;

    mapping(uint => Booking) bookings;
    uint numberOfBookings;
}

struct Booking {
    address booker;
    bool checkedIn;

    /**
     * Timestamp in unix values
     */
    uint StartTime;
    uint EndTime;
}