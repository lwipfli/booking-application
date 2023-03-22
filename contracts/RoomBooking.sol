pragma solidity ^0.8.9;
import "@openzeppelin/contracts/utils/Strings.sol";
enum Amenity {
    RESTAURANT,
    CAFE
}

library BookingLib {

function convertInt256ToString(
        int256 value
    ) public pure returns (string memory) {
        int256 integer = value / 1000000000000000000;
        int256 fractal = value;
        string memory prefix = "";
        string memory decimalPadding = "";

        if (integer < 0) {
            prefix = "-";
            integer = integer * -1;
        }
        if (fractal < 0) {
            fractal = fractal * (-1);
        }
        fractal = fractal % 1000000000000000000;

        if ((0 < fractal) && (fractal < 10)) {
            decimalPadding = "00000000000000000";
        } else if (fractal < 100) {
            decimalPadding = "0000000000000000";
        } else if (fractal < 1000) {
            decimalPadding = "000000000000000";
        } else if (fractal < 10000) {
            decimalPadding = "00000000000000";
        } else if (fractal < 100000) {
            decimalPadding = "0000000000000";
        } else if (fractal < 1000000) {
            decimalPadding = "000000000000";
        } else if (fractal < 10000000) {
            decimalPadding = "00000000000";
        } else if (fractal < 100000000) {
            decimalPadding = "0000000000";
        } else if (fractal < 1000000000) {
            decimalPadding = "000000000";
        } else if (fractal < 10000000000) {
            decimalPadding = "00000000";
        } else if (fractal < 100000000000) {
            decimalPadding = "0000000";
        } else if (fractal < 1000000000000) {
            decimalPadding = "000000";
        } else if (fractal < 10000000000000) {
            decimalPadding = "00000";
        } else if (fractal < 100000000000000) {
            decimalPadding = "0000";
        } else if (fractal < 1000000000000000) {
            decimalPadding = "000";
        } else if (fractal < 10000000000000000) {
            decimalPadding = "00";
        } else if (fractal < 100000000000000000) {
            decimalPadding = "0";
        }

        return
            string(
                abi.encodePacked(
                    prefix,
                    Strings.toString(uint(integer)),
                    ".",
                    decimalPadding,
                    Strings.toString(uint(fractal))
                )
            );
    }

}
struct Room {
    address owner;
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
    uint startTime;
    uint endTime;
}

struct Position {
    int256 latitude;
    int256 longitude;
}
