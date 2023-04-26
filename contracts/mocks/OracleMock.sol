pragma solidity ^0.6.7;

// Use https://github.com/smartcontractkit/hardhat-starter-kit/blob/main/contracts/test/MockOracle.sol as basis for oracle mocking.
import "@chainlink/contracts/src/v0.6/tests/MockOracle.sol";

contract OracleMock is MockOracle {
    constructor(address _link) public MockOracle(_link) {}
}
