pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "./BookingGasInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./AdaptedChainlinkClient.sol";

contract ContractMockBookingWithoutHelper is
    BookingGasInterface,
    OracleHelper,
    AdaptedChainlinkClient,
    Initializable
{
    using Chainlink for Chainlink.Request;

    mapping(address => uint) private linkBalance;
    mapping(bytes32 => uint) private roomIndexPerReqId;

    uint requestCounter;
    address private parent;
    bytes32 private jobId;
    uint256 private fee;
    uint versionNumber;

    function initialize() public initializer {
        requestCounter = 0;
        versionNumber = 1;
        jobId = "JOBID";
        fee = (1 * LINK_DIVISIBILITY) / 10;
        s_requestCount = 1;
    }

    function chainlinkSetup(address linkToken, address oracle) public {
        setChainlinkToken(linkToken);
        setChainlinkOracle(oracle);
    }

    function chargeLinkBalance(uint linkAmount) public {
        LinkTokenInterface(chainlinkTokenAddress()).transferFrom(
            msg.sender,
            address(this),
            linkAmount
        );
        linkBalance[msg.sender] += linkAmount;
    }

    function withdrawLink() public {
        require(linkBalance[msg.sender] > 0);
        uint amount = linkBalance[msg.sender];
        linkBalance[msg.sender] = 0;

        LinkTokenInterface(chainlinkTokenAddress()).transfer(
            msg.sender,
            amount
        );
    }

    function callMapForRoom(
        address origin,
        string memory latitude,
        string memory longitude,
        string memory distance,
        uint roomIndex
    ) external {
        require(linkBalance[tx.origin] >= fee);

        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfillMultipleParameters.selector
        );

        string memory restaurantget = string(
            abi.encodePacked(
                "https://www.overpass-api.de/api/interpreter?data=[out:json];nwr[",
                '"',
                "amenity",
                '"',
                "~",
                '"',
                "restaurant",
                '"',
                "](around:",
                distance,
                ",",
                latitude,
                ",",
                longitude,
                ");out%20count;"
            )
        );

        string memory cafeget = string(
            abi.encodePacked(
                "https://www.overpass-api.de/api/interpreter?data=[out:json];nwr[",
                '"',
                "amenity",
                '"',
                "~",
                '"',
                "cafe",
                '"',
                "](around:",
                distance,
                ",",
                latitude,
                ",",
                longitude,
                ");out%20count;"
            )
        );

        req.add("get", restaurantget);
        // Path corresponds to elements[0].tags.total
        req.add("pathRestaurant", "elements,0,tags,total");
        req.add("get", cafeget);
        req.add("pathCafe", "elements,0,tags,total");
        linkBalance[tx.origin] -= fee;
        sendChainlinkRequest(req, fee);
        roomIndexPerReqId[getRequestId(requestCounter)] = roomIndex;

        emit OracleRequest(
            getRequestId(requestCounter),
            origin,
            latitude,
            longitude,
            distance,
            chainlinkOracleAddress()
        );

        requestCounter++;
    }

    function fulfillMultipleParameters(
        bytes32 _requestId,
        uint256 restaurant,
        uint256 cafe
    ) public recordChainlinkFulfillment(_requestId) {
        uint[] memory result = new uint[](2);
        result[0] = restaurant;
        result[1] = cafe;

        doWhatever(result);

        emit OracleResponse(
            _requestId,
            msg.sender,
            roomIndexPerReqId[_requestId],
            result
        );
    }

    function doWhatever(uint[] memory result) internal {}

    function getRequestId(uint256 count) public view returns (bytes32) {
        return keccak256(abi.encodePacked(this, count));
    }

    function getVersionNumber() external view returns (uint) {
        return versionNumber;
    }

    function addAmenitiesToRoom(uint[] memory result) external {
        doWhatever(result);
    }

    function getImplementationAddress() external view returns (address) {
        return address(this);
    }
}
