pragma solidity ^0.8.9;
import "./../RoomBooking.sol";

contract BookingStorage {
    address private owner;
    address private helper;
    uint private distanceSearchRadius;
    uint private numberOfRooms;
    mapping(bytes32 => address) addressStorage;
    //mapping(address => uint[]) public roomsCreatedByOwners;
    //mapping(address => uint) private pendingWithdrawals;
}
