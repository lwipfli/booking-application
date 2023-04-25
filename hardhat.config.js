require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
      {
        version: "0.7.6",
      },
      {
        version: "0.6.7",
      },
    ],
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 100,
      details: { yul: false },
    },
  },
};

/*
module.exports = {
  solidity: "0.8.17",
  settings: {
    optimizer: {
      enabled: true,
      runs: 100,
      details: { yul: false },
    }
  }
};
*/
