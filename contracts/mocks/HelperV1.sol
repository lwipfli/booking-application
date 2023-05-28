pragma solidity ^0.8.9;

import "./../OracleHelperInterface.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "./../BookingContract.sol";

// Adapted from https://docs.chain.link/any-api/get-request/examples/multi-variable-responses/ and https://docs.chain.link/any-api/get-request/examples/array-response

contract HelperV1 is OracleHelper, ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    address private parent;
    bytes32 private jobId;
    uint256 private fee;

    uint versionNumber;
    uint requestCounter;

    mapping(bytes32 => uint) private roomIndexPerReqId;
    mapping(address => uint) private linkBalance;

    uint private totalLinkBalance;

    modifier onlyParentContract() {
        require(msg.sender == parent);
        _;
    }

    constructor(
        address parentContract,
        address linkTokenAddress,
        address oracleAddress
    ) ConfirmedOwner(msg.sender) {
        parent = parentContract;
        versionNumber = 1;
        requestCounter = 1;
        setChainlinkToken(linkTokenAddress);
        setChainlinkOracle(oracleAddress);
        jobId = "JOBID";
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    function getFee() public view returns (uint) {
        return fee;
    }

    function setFee(uint newFee) public onlyOwner {
        fee = newFee;
    }

    function getJobID() public view returns (bytes32) {
        return jobId;
    }

    function setJobID(bytes32 newJobID) public onlyOwner {
        jobId = newJobID;
    }

    function updateOracleAddress(address newOracle) public onlyOwner {
        setChainlinkOracle(newOracle);
    }

    function checkLinkBalance() public view returns (uint) {
        return linkBalance[msg.sender];
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
        string calldata latitude,
        string calldata longitude,
        string calldata distance,
        uint roomIndex
    ) external onlyParentContract {
        require(linkBalance[origin] >= fee);

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
        linkBalance[origin] -= fee;
        sendChainlinkRequest(req, fee);
        roomIndexPerReqId[getRequestId(requestCounter)] = roomIndex;
        requestCounter++;

        emit OracleRequest(
            getRequestId(requestCounter),
            origin,
            latitude,
            longitude,
            distance,
            chainlinkOracleAddress()
        );
    }

    function fulfillMultipleParameters(
        bytes32 _requestId,
        uint256 restaurant,
        uint256 cafe
    ) public recordChainlinkFulfillment(_requestId) {
        uint[] memory result = new uint[](2);
        result[0] = restaurant;
        result[1] = cafe;

        BookingContract(parent).addAmenitiesToRoom(
            roomIndexPerReqId[_requestId],
            result
        );

        emit OracleResponse(
            _requestId,
            msg.sender,
            roomIndexPerReqId[_requestId],
            result
        );
    }

    function getVersionNumber() external view returns (uint) {
        return versionNumber;
    }

    function getRequestId(uint256 count) public view returns (bytes32) {
        return keccak256(abi.encodePacked(this, count));
    }

    function getFulfillSelector() public view returns (bytes4 selector) {
        return this.fulfillMultipleParameters.selector;
    }

    function getRoomIndexOfRequest(
        bytes32 requestID
    ) public view returns (uint) {
        return roomIndexPerReqId[requestID];
    }

    function getParentContract() public view returns (address) {
        return parent;
    }

    function setParentContract(address newParentContract) public onlyOwner {
        parent = newParentContract;
    }
}
