import "./RoomBooking.sol";
import "./trigonometry/Trigonometry.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";

contract LibraryTest {
    using PRBMathSD59x18 for int256;

    function computeDistanceHaversine(
        int256 lat1,
        int256 long1,
        int256 lat2,
        int256 long2
    ) public view returns (int256 distanceMeters) {
        return BookingLib.computeDistanceHaversine(lat1, long1, lat2, long2);
    }

    function phiRadian(int256 x) public view returns (int256) {
        return
            PRBMathSD59x18.div(
                PRBMathSD59x18.mul(x, int(Trigonometry.PI)),
                PRBMathSD59x18.fromInt(180)
            );
    }

    function delta(int256 x, int256 y) public view returns (int256) {
        return
            PRBMathSD59x18.div(
                PRBMathSD59x18.mul(
                    PRBMathSD59x18.abs(y - x),
                    int(Trigonometry.PI)
                ),
                PRBMathSD59x18.fromInt(180)
            );
    }

    function getUint(int256 x) public view returns (uint) {
        return uint(x);
    }

    function calculateTerm1(int256 deltaPhi) public view returns (int256) {
        // Math.sin(Δφ/2)
        int256 term_1;
        // sin(-φ)=-sin(φ)
        if (deltaPhi < 0) {
            term_1 = PRBMathSD59x18.mul(
                Trigonometry.sin(
                    uint(
                        PRBMathSD59x18.div(
                            (
                                PRBMathSD59x18.mul(
                                    PRBMathSD59x18.fromInt(-1),
                                    deltaPhi
                                )
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
        return term_1;
    }

    function calculateTerm2(int256 phiOne) public view returns (int256) {
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
        return term_2;
    }

    function halfRadian(int256 radian) public view returns (int256) {
        return PRBMathSD59x18.div(radian, PRBMathSD59x18.fromInt(2));
    }

    function cos(int256 radian) public view returns (int256) {
        return Trigonometry.cos(uint(radian));
    }

    function sin(int256 radian) public view returns (int256) {
        return Trigonometry.sin(uint(radian));
    }

    function sqrt(int256 x) public view returns (int256) {
        return PRBMathSD59x18.sqrt(x);
    }

    function OneMinusSqrt(int256 x) public view returns (int256) {
        return PRBMathSD59x18.sqrt(PRBMathSD59x18.fromInt(1) - x);
    }

    function getPi() public view returns (uint256) {
        return Trigonometry.PI;
    }

    function getTwoPi() public view returns (uint256) {
        return Trigonometry.TWO_PI;
    }

    function getHalfPi() public view returns (uint256) {
        return Trigonometry.PI_OVER_TWO;
    }

    function getThreeHalfPi() public view returns (uint256) {
        return (Trigonometry.PI_OVER_TWO) * 3;
    }

    function getFiveTwelthtPi() public view returns (uint256) {
        return (Trigonometry.PI / 12) * 5;
    }

    function getFractionPi(uint fraction) public view returns (uint256) {
        return (Trigonometry.PI / fraction);
    }

    function atan2(int256 x, int256 y) public pure returns (int256) {
        return BookingLib.atan2(x, y);
    }

    function atan2Approx(int256 x, int256 y) public pure returns (int256) {
        return BookingLib.atan2Approx(x, y);
    }

    function c(int256 x) public pure returns (int256) {
        return
            PRBMathSD59x18.mul(
                BookingLib.atan2(
                    PRBMathSD59x18.sqrt(x),
                    PRBMathSD59x18.sqrt(PRBMathSD59x18.fromInt(1) - x)
                ),
                PRBMathSD59x18.fromInt(2)
            );
    }

    function dFromA(int256 x) public pure returns (int256) {
        return
            PRBMathSD59x18.toInt(
                PRBMathSD59x18.mul(
                    PRBMathSD59x18.mul(
                        BookingLib.atan2Approx(
                            PRBMathSD59x18.sqrt(x),
                            PRBMathSD59x18.sqrt(PRBMathSD59x18.fromInt(1) - x)
                        ),
                        PRBMathSD59x18.fromInt(2)
                    ),
                    PRBMathSD59x18.fromInt(6371000)
                )
            );
    }

    function power(int256 x) public pure returns (int256) {
        return PRBMathSD59x18.mul(x, x);
    }

    function calculateA(
        int256 phiOne,
        int256 phiTwo,
        int256 deltaPhi,
        int256 deltaLambda
    ) public view returns (int256) {
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
}
