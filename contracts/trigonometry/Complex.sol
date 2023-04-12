// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/// @title num_complex_solidity
/// @dev COMPLEX MATH FUNCTIONS WITH 2 z INPUTS
/// @author Alexander John Lee
/// @notice Solidity library offering basic complex number functions where inputs and outputs are
/// signed integers.

/// Huge thanks to the authors of the the mds1/solidity-trigonometry and prb/math repositories

// Copied and adapted as a library from https://github.com/partylikeits1983/num_complex_solidity

import "prb-math/contracts/PRBMathSD59x18.sol";
import "./Trigonometry.sol";

library Complex {
    using PRBMathSD59x18 for int256;

    struct complex {
        int re;
        int im;
    }

    /// @notice ADDITION
    /// @param re real 1
    /// @param im imaginary 1
    /// @param re1 real 2
    /// @param im1 imaginary 2
    /// @return re real
    /// @return im imaginary
    function add(
        int re,
        int im,
        int re1,
        int im1
    ) public pure returns (int, int) {
        re += re1;
        im += im1;

        return (re, im);
    }

    /// @notice SUBTRACTION
    /// @param re real 1
    /// @param im imaginary 1
    /// @param re1 real 2
    /// @param im1 imaginary 2
    /// @return re real
    /// @return im imaginary
    function sub(
        int re,
        int im,
        int re1,
        int im1
    ) public pure returns (int, int) {
        re -= re1;
        im -= im1;

        return (re, im);
    }

    /// @notice MULTIPLICATION
    /// @param re real 1
    /// @param im imaginary 1
    /// @param re1 real 2
    /// @param im1 imaginary 2
    /// @return re real
    /// @return im imaginary
    function mul(
        int re,
        int im,
        int re1,
        int im1
    ) public pure returns (int, int) {
        int a = re * re1;
        int b = im * im1;
        int c = im * re1;
        int d = re * im1;

        re = a - b;
        im = c + d;

        re /= 1e18;
        im /= 1e18;

        return (re, im);
    }

    /// @notice DIVISION
    /// @param re real 1
    /// @param im imaginary 1
    /// @param re1 real 2
    /// @param im1 imaginary 2
    /// @return re real
    /// @return im imaginary
    function div(
        int re,
        int im,
        int re1,
        int im1
    ) public pure returns (int, int) {
        int numA = re * re1 + im * im1;
        int den = re1 ** 2 + im1 ** 2;
        int numB = im * re1 - re * im1;

        re = (numA * 1e18) / den;
        im = (numB * 1e18) / den;

        return (re, im);
    }

    /// @notice CALCULATE HYPOTENUSE
    /// @dev r^2 = a^2 + b^2
    /// @param a a
    /// @param b b
    /// @return r r
    function r2(int a, int b) public pure returns (int) {
        a = a.mul(a);
        b = b.mul(b);
        return (a + b).sqrt();
    }

    /// @notice CONVERT COMPLEX NUMBER TO POLAR COORDINATES
    /// @dev WARNING R2 FUNCTION ALWAYS RETURNS POSITIVE VALUES => ELSE{code} IS UNREACHABLE
    /// @dev // atan vs atan2
    /// @param re real part
    /// @param im imaginary part
    /// @return r r
    /// @return T theta
    function toPolar(int re, int im) public pure returns (int, int) {
        int r = r2(re, im);
        //int BdivA = re / im;
        if (r > 0) {
            // im/re or re/im ??
            int T = p_atan2(im, re);
            return (r, T);
        } else {
            // !!! if r is negative !!!
            int T = p_atan2(im, re) + 180e18;
            return (r, T);
        }
    }

    /// @notice CONVERT FROM POLAR TO COMPLEX
    /// @dev https://github.com/rust-num/num-complex/blob/3a89daa2c616154035dd27d706bf7938bcbf30a8/src/lib.rs#L182
    /// @param r r
    /// @param T theta
    /// @return re real
    /// @return im imaginary
    function fromPolar(int r, int T) public pure returns (int re, int im) {
        // @dev check if T is negative
        if (T > 0) {
            re = (r * Trigonometry.cos(uint(T))) / 1e18;
            im = (r * Trigonometry.sin(uint(T))) / 1e18;
        } else {
            re = (r * Trigonometry.cos(uint(T))) / 1e18;
            // this specific line was a nightmare lol all good now though
            im = -(r * Trigonometry.sin(uint(T * -1))) / 1e18;
        }
    }

    /// @notice ATAN2(Y,X) FUNCTION (LESS PRECISE LESS GAS)
    /// @param y y
    /// @param x x
    /// @return T T
    function atan2(int y, int x) public pure returns (int T) {
        int c1 = 3141592653589793300 / 4;
        int c2 = 3 * c1;
        int abs_y = y.abs() + 1e8;

        if (x >= 0) {
            int r = ((x - abs_y) * 1e18) / (x + abs_y);
            T = (c1 * 1e18 - c1 * r) / 1e18;
        } else {
            int r = ((x + abs_y) * 1e18) / (abs_y - x);
            T = (c2 * 1e18 - c1 * r) / 1e18;
        }
        if (y < 0) {
            return -T;
        } else {
            return T;
        }
    }

    /// @notice ATAN2(Y,X) FUNCTION (MORE PRECISE MORE GAS)
    /// @param y y
    /// @param x x
    /// @return T T
    function p_atan2(int y, int x) public pure returns (int T) {
        int c1 = 3141592653589793300 / 4;
        int c2 = 3 * c1;
        int abs_y = y.abs() + 1e8;

        if (x >= 0) {
            int r = ((x - abs_y) * 1e18) / (x + abs_y);
            T = (1963e14 * r ** 3) / 1e54 - (9817e14 * r) / 1e18 + c1;
        } else {
            int r = ((x + abs_y) * 1e18) / (abs_y - x);
            T = (1963e14 * r ** 3) / 1e54 - (9817e14 * r) / 1e18 + c2;
        }
        if (y < 0) {
            return -T;
        } else {
            return T;
        }
    }

    /// @notice PRECISE ATAN2(Y,X) FROM range -1 to 1 (MORE PRECISE LESS GAS)
    /// @param x (y/x)
    /// @return T T
    function atan1to1(int x) public pure returns (int) {
        int y = ((7.85e17 * x) / 1e18) -
            (((x * (x - 1e18)) / 1e18) * (2.447e17 + ((6.63e16 * x) / 1e18))) /
            1e18;
        return y;
    }

    /// @notice COMPLEX NATURAL LOGARITHM
    /// @param re real
    /// @param im imaginary
    /// @return re real
    /// @return im imaginary
    function complexLN(int re, int im) public pure returns (int, int) {
        int T;

        (re, T) = toPolar(re, im);

        re = re.ln();
        im = T;

        return (re, im);
    }

    /// @notice COMPLEX SQUARE ROOT
    /// @dev only works if 0 < re & im
    /// @param re real
    /// @param im imaginary
    /// @return re real
    /// @return im imaginary
    function complexSQRT(int re, int im) public pure returns (int, int) {
        // if imaginary is 0
        if (im == 0) {
            // if real is positive
            if (re > 0) {
                // simple positive real √r, and copy `im` for its sign
                re = re.sqrt();
            }
            // if real is negative
            else {
                // √(r e^(iπ)) = √r e^(iπ/2) = i√r
                // √(r e^(-iπ)) = √r e^(-iπ/2) = -i√r
                // if real is negative
                im = -re.sqrt();
                // if imaginary is positive
                if (im > 0) {
                    re = 0;
                } else {
                    // if imaginary is negative
                    im = -im;
                }
            }
        } else if (re == 0) {
            // √(r e^(iπ/2)) = √r e^(iπ/4) = √(r/2) + i√(r/2)
            // √(r e^(-iπ/2)) = √r e^(-iπ/4) = √(r/2) - i√(r/2
            re = (im.abs() / 2).sqrt();
            if (re > 0) {
                im = re;
            } else {
                im = -re;
            }
        } else {
            // formula: sqrt(r e^(it)) = sqrt(r) e^(it/2)
            (int r, int T) = toPolar(re, im);
            (re, im) = fromPolar(r.sqrt(), T / 2);
        }
        return (re, im);
    }

    /// @notice COMPLEX EXPONENTIAL
    /// @dev e^(a + bi) = e^a (cos(b) + i*sin(b))
    /// @param re re
    /// @param im im
    /// @return re re
    /// @return im im
    function complexEXP(int re, int im) public pure returns (int, int) {
        int r = re.exp();
        (re, im) = fromPolar(r, im);

        return (re, im);
    }

    /// @notice COMPLEX POWER
    /// @dev using Demoivre's formula
    /// @dev overflow risk
    /// @param re re
    /// @param im im
    /// @param n base 1e18
    /// @return re re
    /// @return im im
    function complexPOW(int re, int im, int n) public pure returns (int, int) {
        (int r, int theta) = toPolar(re, im);

        // gas savings
        int rTOn = r.pow(n);
        int nTheta = (n * theta) / 1e18;

        re = (rTOn * Trigonometry.cos(uint(nTheta))) / 1e18;
        im = (rTOn * Trigonometry.sin(uint(nTheta))) / 1e18;

        return (re, im);
    }
}
