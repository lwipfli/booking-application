const hre = require("hardhat");

var enable_logging = true;

function log(...args) {
  if (enable_logging) {
    console.log(...args);
  }
}

//Total gas cost computation from: https://ethereum.stackexchange.com/questions/92353/how-do-i-find-the-gasprice-of-a-confirmed-transaction-with-ethers-js

function getTotalCost(receipt) {
  return receipt.effectiveGasPrice.mul(receipt.gasUsed);
}

function getTotalGasDifference(receipt1, receipt2) {
  return (
    receipt1.effectiveGasPrice.mul(receipt1.gasUsed) -
    receipt2.effectiveGasPrice.mul(receipt2.gasUsed)
  );
}

async function deployContractsAndLogCosts() {
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

  const BookingContractWithoutHelper = await hre.ethers.getContractFactory(
    "ContractMockBookingWithoutHelper"
  );

  const bookingWithoutHelper = await upgrades.deployProxy(
    BookingContractWithoutHelper,
    {
      initializer: "initialize",
    }
  );

  const BookingContractWithHelper = await hre.ethers.getContractFactory(
    "ContractMockBookingWithHelper"
  );

  const bookingWithHelper = await upgrades.deployProxy(
    BookingContractWithHelper,
    {
      initializer: "initialize",
    }
  );

  const currentImplAddress = await bookingWithHelper.getImplementationAddress();
  const helperMockContract = await ethers.getContractFactory("HelperGas");

  const helper = await helperMockContract
    .connect(owner)
    .deploy(currentImplAddress, tokenMock.address, oracleMock.address);

  await helper.deployed();

  const helperlinkTransaction = await bookingWithHelper
    .connect(owner)
    .setHelper(helper.address);
  const setUpTransaction = await bookingWithoutHelper.chainlinkSetup(
    tokenMock.address,
    oracleMock.address
  );

  var bookingWithoutHelperCost = (
    await bookingWithoutHelper.deployTransaction.wait()
  ).gasUsed;
  var bookingWithHelperCost = (await bookingWithHelper.deployTransaction.wait())
    .gasUsed;
  var helperCost = (await helper.deployTransaction.wait()).gasUsed;

  var helperLinkCost = (await helperlinkTransaction.wait()).gasUsed;

  var setUpWithoutHelperCost = (await setUpTransaction.wait()).gasUsed;

  log("Gas limits for transactions:");

  log(
    "",
    bookingWithoutHelperCost.toString(),
    "cost of contract without Helper."
  );

  log(" ", setUpWithoutHelperCost.toString(), "cost of setup without Helper.");

  log("", bookingWithHelperCost.toString(), "cost of contract with Helper.");

  log(helperCost.toString(), "cost of helper.");

  log(" ", helperLinkCost.toString(), "cost of linking helper.");

  log(
    bookingWithHelperCost
      .add(helperCost)
      .add(helperLinkCost)
      .sub(bookingWithoutHelperCost)
      .sub(setUpWithoutHelperCost)
      .toString(),
    " difference."
  );

  await tokenMock
    .connect(owner)
    .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

  await tokenMock
    .connect(otherAccount)
    .approve(helper.address, ethers.utils.parseUnits("1", 17));

  await tokenMock
    .connect(otherAccount)
    .approve(bookingWithoutHelper.address, ethers.utils.parseUnits("1", 17));

  await helper
    .connect(otherAccount)
    .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

  await bookingWithoutHelper
    .connect(otherAccount)
    .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

  return {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    bookingWithoutHelper,
    bookingWithHelper,
    helper,
  };
}

async function main() {
  const {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    bookingWithoutHelper,
    bookingWithHelper,
    helper,
  } = await deployContractsAndLogCosts();

  const transactionWithoutHelper = await bookingWithoutHelper
    .connect(otherAccount)
    .callMapForRoom(otherAccount.address, "50.0", "0.0", "10.0", 0);

  const transactionWithtHelper = await bookingWithHelper
    .connect(otherAccount)
    .callMapForRoom(otherAccount.address, "50.0", "0.0", "10.0", 0);

  var RequestTransactionWithoutHelperCost = (
    await transactionWithoutHelper.wait()
  ).gasUsed;

  var RequestTransactionWithHelperCost = (await transactionWithtHelper.wait())
    .gasUsed;

  log(
    RequestTransactionWithoutHelperCost.toString(),
    "request cost without helper."
  );

  log(RequestTransactionWithHelperCost.toString(), "request cost with helper.");

  log(
    "",
    RequestTransactionWithoutHelperCost.sub(
      RequestTransactionWithHelperCost
    ).toString(),
    "difference of request transaction costs."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
