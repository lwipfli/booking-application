pragma solidity ^0.8.9;

struct Room {
    /*
    * Both values are intended to have 15 decimal points.
    * longitude must be between 180'00000'00000'00000 and -180'00000'00000'00000
    * latitude  must be between  90'00000'00000'00000 and  -90'00000'00000'00000
    *
    */
    int128 latitude;
    int128 longitude;
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