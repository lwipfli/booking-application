pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

// Use https://github.com/smartcontractkit/hardhat-starter-kit/blob/main/contracts/test/MockOracle.sol as basis for oracle mocking.
import "./MockOracleAdapted.sol";

contract OracleMock is MockOracleAdapted {
    event OracleRequestFulfilled(
        address callbackAddr,
        bytes4 callbackFunctionId,
        bytes32 indexed requestId,
        uint256 restaurant,
        uint cafe
    );

    constructor(address _link) public MockOracleAdapted(_link) {}

    function fulfillHelperRequest(
        bytes32 _requestId,
        uint256 restaurant,
        uint256 cafe
    ) external isValidRequest(_requestId) returns (bool) {
        Request memory req = commitments[_requestId];

        require(gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT);

        (bool success, ) = req.callbackAddr.call(
            abi.encodeWithSelector(
                req.callbackFunctionId,
                _requestId,
                restaurant,
                cafe
            )
        );

        require(success, "Remote call unsuccessfull.");
        delete commitments[_requestId];
        emit OracleRequestFulfilled(
            req.callbackAddr,
            req.callbackFunctionId,
            _requestId,
            restaurant,
            cafe
        );
        return success;
    }

    function getRequest(
        bytes32 _requestId
    ) public view returns (Request memory) {
        return commitments[_requestId];
    }
}
