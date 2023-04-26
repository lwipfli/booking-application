pragma solidity ^0.8.9;

// Adapted from https://github.com/smartcontractkit/hardhat-starter-kit/blob/main/contracts/test/MockOracle.sol for hihgher solidity version.
//import "@chainlink/contracts/src/v0.6/tests/MockOracle.sol";
//import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenReceiver.sol";
import "@chainlink/contracts/src/v0.8/interfaces/ChainlinkRequestInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

//import "@chainlink/contracts/src/v0.8/vendor/SafeMathChainlink.sol";

contract OracleMock  is ChainlinkRequestInterface {

    function oracleRequest(
    address sender,
    uint256 requestPrice,
    bytes32 serviceAgreementID,
    address callbackAddress,
    bytes4 callbackFunctionId,
    uint256 nonce,
    uint256 dataVersion,
    bytes calldata data
  ) external {}

  function cancelOracleRequest(
    bytes32 requestId,
    uint256 payment,
    bytes4 callbackFunctionId,
    uint256 expiration
  ) external{}


}
