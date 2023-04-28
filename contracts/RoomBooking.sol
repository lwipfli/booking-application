pragma solidity ^0.8.9;
import "@openzeppelin/contracts/utils/Strings.sol";
import "./trigonometry/Trigonometry.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "./trigonometry/Complex.sol";

enum Amenity {
    RESTAURANT,
    CAFE,
    LAST
}

library BookingLib {
    using PRBMathSD59x18 for int256;

    function atan2Approx(int256 x, int256 y) internal pure returns (int256) {
        // From https://github.com/NovakDistributed/macroverse/blob/master/contracts/RealMath.sol
        int256 result;

        int256 abs_x = PRBMathSD59x18.abs(y);
        int256 abs_y = PRBMathSD59x18.abs(x);

        if (abs_x > abs_y) {
            result = atanSmall(PRBMathSD59x18.div(abs_y, abs_x));
        } else {
            result =
                PRBMathSD59x18.div(
                    PRBMathSD59x18.pi(),
                    PRBMathSD59x18.fromInt(2)
                ) -
                atanSmall(PRBMathSD59x18.div(abs_x, abs_y));
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

        return result;
    }

    function atanSmall(int256 x) internal pure returns (int256) {
        // From https://github.com/NovakDistributed/macroverse/blob/master/contracts/RealMath.sol
        int256 x_squared = PRBMathSD59x18.pow(x, PRBMathSD59x18.fromInt(2));
        return
            PRBMathSD59x18.mul(
                (PRBMathSD59x18.mul(
                    (PRBMathSD59x18.mul(
                        (PRBMathSD59x18.mul(
                            (PRBMathSD59x18.mul(
                                (PRBMathSD59x18.mul(
                                    -12606780422000000,
                                    x_squared
                                ) + 57120178819000000),
                                x_squared
                            ) - 127245381171000000),
                            x_squared
                        ) + 212464129393000000),
                        x_squared
                    ) - 365662383026000000),
                    x_squared
                ) + 1099483040474000000),
                x
            );
    }

    function atan2(int256 x, int256 y) internal pure returns (int256) {
        return Complex.p_atan2(x, y);
    }

    function tangent(uint256 x) internal pure returns (uint256) {
        return
            uint256(
                PRBMathSD59x18.div(Trigonometry.sin(x), Trigonometry.cos(x))
            );
    }

    function computeDistanceHaversine(
        int256 lat1,
        int256 long1,
        int256 lat2,
        int256 long2
    ) public pure returns (int256 distanceMeters) {
        // From https://www.movable-type.co.uk/scripts/latlong.html

        int256 R = PRBMathSD59x18.fromInt(6371000);
        int256 phi1 = PRBMathSD59x18.div(
            (lat1 * PRBMathSD59x18.pi()),
            PRBMathSD59x18.fromInt(180)
        );

        int256 phi2 = PRBMathSD59x18.div(
            (lat2 * PRBMathSD59x18.pi()),
            PRBMathSD59x18.fromInt(180)
        );

        int256 deltaPhi = PRBMathSD59x18.div(
            PRBMathSD59x18.mul(
                PRBMathSD59x18.abs(lat2 - lat1),
                PRBMathSD59x18.pi()
            ),
            PRBMathSD59x18.fromInt(180)
        );

        int256 deltaLambda = PRBMathSD59x18.div(
            PRBMathSD59x18.mul(
                PRBMathSD59x18.abs(long2 - long1),
                PRBMathSD59x18.pi()
            ),
            PRBMathSD59x18.fromInt(180)
        );

        int256 a = PRBMathSD59x18.abs(
            calculateA(phi1, phi2, deltaPhi, deltaLambda)
        );

        int256 c = PRBMathSD59x18.mul(
            PRBMathSD59x18.fromInt(2),
            atan2Approx(
                PRBMathSD59x18.sqrt(a),
                PRBMathSD59x18.sqrt(PRBMathSD59x18.fromInt(1) - a)
            )
        );
        return
            PRBMathSD59x18.toInt(PRBMathSD59x18.abs(PRBMathSD59x18.mul(R, c)));
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
            term_1 = PRBMathSD59x18.mul(
                Trigonometry.sin(
                    uint(
                        PRBMathSD59x18.div(
                            PRBMathSD59x18.mul(
                                PRBMathSD59x18.fromInt(-1),
                                deltaPhi
                            ),
                            PRBMathSD59x18.fromInt(2)
                        )
                    )
                ),
                PRBMathSD59x18.fromInt(-1)
            );
        } else {
            term_1 = Trigonometry.sin(
                uint(PRBMathSD59x18.div(deltaPhi, PRBMathSD59x18.fromInt(2)))
            );
        }

        // Math.cos(φ1)
        int256 term_2;
        // cos(-φ)=cos(φ)
        if (phiOne < 0) {
            term_2 = Trigonometry.cos(
                uint(PRBMathSD59x18.mul(PRBMathSD59x18.fromInt(-1), phiOne))
            );
        } else {
            term_2 = Trigonometry.cos(uint(phiOne));
        }
        // Math.cos(φ2)
        int256 term_3;

        if (phiTwo < 0) {
            term_3 = Trigonometry.cos(
                uint(PRBMathSD59x18.mul(PRBMathSD59x18.fromInt(-1), phiTwo))
            );
        } else {
            term_3 = Trigonometry.cos(uint(phiTwo));
        }
        // Math.sin(Δλ/2)

        int256 term_4;
        if (deltaLambda < 0) {
            term_4 = PRBMathSD59x18.mul(
                Trigonometry.sin(
                    uint(
                        PRBMathSD59x18.div(
                            (
                                PRBMathSD59x18.mul(
                                    PRBMathSD59x18.fromInt(-1),
                                    deltaLambda
                                )
                            ),
                            PRBMathSD59x18.fromInt(2)
                        )
                    )
                ),
                PRBMathSD59x18.fromInt(-1)
            );
        } else {
            term_4 = Trigonometry.sin(
                uint(PRBMathSD59x18.div(deltaLambda, PRBMathSD59x18.fromInt(2)))
            );
        }

        return
            (PRBMathSD59x18.pow(term_1, PRBMathSD59x18.fromInt(2))) +
            (
                PRBMathSD59x18.mul(
                    PRBMathSD59x18.mul(term_2, term_3),
                    PRBMathSD59x18.mul(term_4, term_4)
                )
            );
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
