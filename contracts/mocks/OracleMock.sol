pragma solidity ^0.6.7;

// Use https://github.com/smartcontractkit/hardhat-starter-kit/blob/main/contracts/test/MockOracle.sol as basis for oracle mocking.
import "./MockOracleAdapted.sol";

contract OracleMock is MockOracleAdapted {
    constructor(address _link) public MockOracleAdapted(_link) {}

    function fulfillHelperRequest(
        bytes32 _requestId,
        uint restaurant,
        uint cafe
    ) external isValidRequest(_requestId) returns (bool) {
        Request memory req = commitments[_requestId];
        delete commitments[_requestId];
        require(
            gasleft() >= MINIMUM_CONSUMER_GAS_LIMIT,
            "Must provide consumer enough gas"
        );

        (bool success, ) = req.callbackAddr.call(
            abi.encodeWithSelector(
                req.callbackFunctionId,
                _requestId,
                restaurant,
                cafe
            )
        );
        return success;
    }
}
