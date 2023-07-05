pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "./BookingGasInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ContractMockBookingWithHelper is BookingGasInterface, Initializable {

    address private helper;

    function initialize() public initializer {}

    function setHelper(address newHelper) public {
        helper = newHelper;
    }

    function callMapForRoom(
        address origin,
        string memory latitude,
        string memory longitude,
        string memory distance,
        uint roomIndex
    ) public {
        OracleHelper(helper).callMapForRoom(
            msg.sender,
            latitude,
            longitude,
            distance,
            roomIndex
        );
    }

    function addAmenitiesToRoom(uint256[] memory result) external {
        doWhatever(result);
    }

    function doWhatever(uint[] memory result) internal {}

    function getImplementationAddress() external view returns (address) {
        return address(this);
    }
}
