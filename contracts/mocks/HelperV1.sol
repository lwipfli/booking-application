pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "./../BookingContract.sol";

// Adapted from https://docs.chain.link/any-api/get-request/examples/multi-variable-responses/ and https://docs.chain.link/any-api/get-request/examples/array-response

contract HelperV1 is OracleHelper, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    bytes32 private jobId;
    uint256 private fee;

    event RequestFulfilled(bytes32 indexed requestId, uint256[] resultArray);

    uint private versionNumber;
    uint requestCounter;

    address public parentContract;

    mapping(bytes32 => uint) private roomIndexPerReqId;

    modifier onlyParent() {
        require((msg.sender == parentContract));
        _;
    }

    constructor(
        address parentContract,
        address linkTokenAddress,
        address oracleAddress
    ) ConfirmedOwner(parentContract) {
        versionNumber = 1;
        requestCounter=0;
        setChainlinkToken(linkTokenAddress);
        setChainlinkOracle(oracleAddress);
        jobId = "JOBID";
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    function callMapForRoom (
        string calldata latitude,
        string calldata longitude,
        string calldata distance,
        uint roomIndex
    ) onlyOwner external {
        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillMultipleParameters.selector
        );

            string memory restaurantget = string(
                abi.encodePacked(
                    'https://www.overpass-api.de/api/interpreter?data=[out:json];nwr[',
                    '"',
                    "amenity",
                    '"',
                    "~",
                    '"',
                    "restaurant",
                    '"',
                    "](around:",
                    distance,
                    ',',
                    latitude,
                    ',',
                    longitude,
                    ");out%20count;"
                )
            );

            string memory cafeget = string(
                abi.encodePacked(
                    'https://www.overpass-api.de/api/interpreter?data=[out:json];nwr[',
                    '"',
                    "amenity",
                    '"',
                    "~",
                    '"',
                    "cafe",
                    '"',
                    "](around:",
                    distance,
                    ',',
                    latitude,
                    ',',
                    longitude,
                    ");out%20count;"
                )
            );

        req.add(
            "get",
            restaurantget
        );
        // Path corresponds to elements[0].tags.total
        req.add("pathRestaurant", "elements,0,tags,total");
        req.add(
            "get",
            cafeget
        );
        req.add("pathCafe", "elements,0,tags,total");
        sendChainlinkRequest(req, fee);
        roomIndexPerReqId[req.id]=roomIndex;
    }

    function fulfillMultipleParameters(bytes32 _requestId,
         uint restaurant, uint cafe) public recordChainlinkFulfillment(_requestId) {
            uint[] memory result = new uint[](2);
            result[0]= restaurant;
            result[1]= cafe;
        BookingContract(parentContract).addAmenitiesToRoom(roomIndexPerReqId[_requestId],result);
    }

    function getVersionNumber() external view returns (uint) {
        return versionNumber;
    }
}
