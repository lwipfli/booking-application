pragma solidity ^0.8.9;
import "@openzeppelin/contracts/utils/Strings.sol";
import "./trigonometry/Trigonometry.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
enum Amenity {
    RESTAURANT,
    CAFE
}

library BookingLib {
    using PRBMathSD59x18 for int256;

    function atan2(int256 x, int256 y) internal pure returns (uint256) {
        // From https://github.com/NovakDistributed/macroverse/blob/master/contracts/RealMath.sol
        int256 result;

        int256 abs_x = x.abs();
        int256 abs_y = y.abs();

        if (abs_x > abs_y) {
            result = atanSmall((abs_y / abs_x));
        } else {
            result = (PRBMathSD59x18.pi() / 2) - atanSmall((abs_x / abs_y));
        }

        if (x < 0) {
            if (y < 0) {
                result -= PRBMathSD59x18.pi();
            } else {
                result = PRBMathSD59x18.pi() - result;
            }
        } else {
            if (y < 0) {
                result = -result;
            }
        }

        return uint(result);
    }

    function atanSmall(int256 x) internal pure returns (int256) {
        // From https://github.com/NovakDistributed/macroverse/blob/master/contracts/RealMath.sol
        int256 x_squared = x.pow(2);
        return (((((((((((-12606780422 * x_squared) + 57120178819) *
            x_squared) - 127245381171) * x_squared) + 212464129393) *
            x_squared) - 365662383026) * x_squared) + 1099483040474) * x);
    }

    function tangent(uint256 x) internal pure returns (uint256) {
        return uint256(Trigonometry.sin(x) / Trigonometry.cos(x));
    }

    function computeDistanceHaversine(
        int256 lat1,
        int256 long1,
        int256 lat2,
        int256 long2
    ) public pure returns (int256 distanceMeters) {
        // From https://www.movable-type.co.uk/scripts/latlong.html

        int256 R = 6371000000000000000000000;
        int256 phi1 = (lat1 * int(Trigonometry.PI)) / 180000000000000000000;

        int256 phi2 = (lat2 * int(Trigonometry.PI)) / 180000000000000000000;

        int256 deltaPhi = (((lat2 - lat1).abs() * int(Trigonometry.PI)) /
            180000000000000000000);

        int256 deltaLambda = (((long2 - long1).abs() * int(Trigonometry.PI)) /
            180000000000000000000);

        int256 a = calculateA(phi1, phi2, deltaPhi, deltaLambda);

        int256 c = 2000000000000000000 *
            int(atan2(a.sqrt(), (1000000000000000000 - a).sqrt()));
        return ((R * c) / 1000000000000000000);
    }

    function calculateA(
        int256 phiOne,
        int256 phiTwo,
        int256 deltaPhi,
        int256 deltaLambda
    ) public pure returns (int256) {
        // Math.sin(Δφ/2)
        int256 term_1;
        // sin(-φ)=-sin(φ)
        if (deltaPhi < 0) {
            term_1 =
                Trigonometry.sin(uint((-1 * deltaPhi) / 2000000000000000000)) *
                -1;
        } else {
            term_1 = Trigonometry.sin(uint(deltaPhi / 2000000000000000000));
        }
        // Math.cos(φ1)
        int256 term_2;
        // cos(-φ)=cos(φ)
        if (phiOne < 0) {
            term_2 = Trigonometry.cos(uint(-1 * phiOne));
        } else {
            term_2 = Trigonometry.cos(uint(phiOne));
        }
        // Math.cos(φ2)
        int256 term_3;
        if (phiTwo < 0) {
            term_3 = Trigonometry.cos(uint(-1 * phiTwo));
        } else {
            term_3 = Trigonometry.cos(uint(phiTwo));
        }
        // Math.sin(Δλ/2)
        int256 term_4;
        if (deltaLambda < 0) {
            term_4 =
                Trigonometry.sin(
                    uint((-1 * deltaLambda) / 2000000000000000000)
                ) *
                -1;
        } else {
            term_4 = Trigonometry.sin(uint(deltaLambda / 2000000000000000000));
        }

        return (term_1 * term_1) + (term_2 * term_3 * term_4 * term_4);
    }

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
