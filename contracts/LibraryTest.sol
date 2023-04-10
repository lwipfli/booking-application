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
        return ((x * int(Trigonometry.PI)) / 180000000000000000000);
    }

    function delta(int256 x, int256 y) public view returns (int256) {
        int256 deltaPhi = (((y - x).abs() * int(Trigonometry.PI)) /
            180000000000000000000);
        return deltaPhi;
    }

    function calculateTerm1(int256 deltaPhi) public view returns (int256) {
        // Math.sin(Δφ/2)
        int256 term_1;
        // sin(-φ)=-sin(φ)
        if (deltaPhi < 0) {
            term_1 = Trigonometry.sin(uint((-1 * deltaPhi) / 2)) * -1;
        } else {
            term_1 = Trigonometry.sin(uint(deltaPhi / 2));
        }
        return term_1;
    }

    function calculateTerm2(int256 phiOne) public view returns (int256) {
        // Math.cos(φ1)
        int256 term_2;
        // cos(-φ)=cos(φ)
        if (phiOne < 0) {
            term_2 = Trigonometry.cos(uint(-1 * phiOne));
        } else {
            term_2 = Trigonometry.cos(uint(phiOne));
        }
        return term_2;
    }

    function halfRadian(int256 radian) public view returns (int256) {
        return (radian / 2);
    }

    function cos(int256 radian) public view returns (int256) {
        return Trigonometry.cos(uint(radian));
    }

    function sin(int256 radian) public view returns (int256) {
        return Trigonometry.sin(uint(radian));
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

    function c(int256 x) public pure returns (int256) {
        return
            (BookingLib.atan2((x).sqrt(), (1000000000000000000 - x).sqrt())) *
            2000000000000000000;
    }

    function dFromA(int256 x) public pure returns (int256) {
        return
            (BookingLib.atan2((x).sqrt(), (1000000000000000000 - x).sqrt())) *
            2000000000000000000 *
            6731000000000000000;
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

        return (term_1.pow(2)) + (term_2 * term_3 * term_4.pow(2));
    }
}
