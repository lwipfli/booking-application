pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BookingUpgradeable is UUPSUpgradeable, Ownable {
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
