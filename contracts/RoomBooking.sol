pragma solidity ^0.8.9;

struct Room {

    string latitude;
    string longitude;
    uint searchRadius;
    bool bookable;
    uint pricePerDay;
    string uri;
    string url;
    string amenities;
    Booking[] bookings;
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