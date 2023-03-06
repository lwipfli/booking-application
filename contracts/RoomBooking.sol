pragma solidity ^0.8.9;


enum Amenity {
    RESTAURANT
    }

struct Room {

    address owner;
    //bytes32 id;
    // Maximum precision for decimals should be 15.
    int latitudeInteger;
    uint latitudeDecimals;
    int longitude;
    uint longitudeDecimals;
    uint searchRadius;
    bool bookable;
    uint pricePerDay;
    string uri;
    string amenities;

    Booking[] bookings;
    uint numberOfBookings;
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