const hre = require("hardhat");

var enable_logging = true;

function log(...args) {
  if (enable_logging) {
    console.log(...args);
  }
}


//Total gas cost computation from: https://ethereum.stackexchange.com/questions/92353/how-do-i-find-the-gasprice-of-a-confirmed-transaction-with-ethers-js

function getCost(receipt) {
  return receipt.effectiveGasPrice.mul(receipt.gasUsed);
};


async function deployContracts() {
  const [owner, otherAccount] = await hre.ethers.getSigners();

  const tokenMockContract = await hre.ethers.getContractFactory(
    "LinkTokenMock"
  );
  const tokenMock = await tokenMockContract.connect(owner).deploy();
  await tokenMock.deployed();

  const mockOracleContract = await hre.ethers.getContractFactory("OracleMock");
  const oracleMock = await mockOracleContract
    .connect(owner)
    .deploy(tokenMock.address);
  await oracleMock.deployed();

  const Lib = await hre.ethers.getContractFactory("BookingLib");
  const lib = await Lib.deploy();
  await lib.deployed();

  log("Library gas price: ",await lib.deployTransaction.gasPrice.toString());
  log("Library deplyoment cost: ",getCost(await lib.deployTransaction.wait()).toString());

  const BookingContract = await hre.ethers.getContractFactory(
    "BookingContract",
    {
      signer: otherAccount[0],
      libraries: {
        BookingLib: lib.address,
      },
    }
  );

  const booking = await upgrades.deployProxy(BookingContract, {
    initializer: "initialize",
    unsafeAllow: ["external-library-linking"],
  });

  log("Booking gas price: ",await booking.deployTransaction.gasPrice.toString());
  log("Booking deplyoment cost: ",getCost(await booking.deployTransaction.wait()).toString());
  

  const currentImplAddress = await booking.getImplementationAddress();
  const helperMockContract = await ethers.getContractFactory("HelperV1");

  const helperMockV1 = await helperMockContract
    .connect(owner)
    .deploy(currentImplAddress, tokenMock.address, oracleMock.address);

  await helperMockV1.deployed();

  log("Helper gas price: ",await helperMockV1.deployTransaction.gasPrice.toString());
  log("Helper deplyoment cost: ",getCost(await helperMockV1.deployTransaction.wait()).toString());

  const helperlinkTransaction = await booking.connect(owner).setHelper(helperMockV1.address);

  log("HelperLink gas price: ",helperlinkTransaction.gasPrice.toString());
  log("HelperLink cost: ",getCost(await helperlinkTransaction.wait()).toString());

  await tokenMock
    .connect(owner)
    .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

  // Make sure that helper is allowed to transfer link from user
  await tokenMock
    .connect(otherAccount)
    .approve(helperMockV1.address, ethers.utils.parseUnits("1", 17));

  await helperMockV1
    .connect(otherAccount)
    .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

  return {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    lib,
    booking,
    helperMockV1,
  };
}

async function main() {
  const {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    lib,
    booking,
    helperMockV1,
  } = await deployContracts();
  



}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
