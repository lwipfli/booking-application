const hre = require("hardhat");

async function main() {
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

  console.log("Deployed the contracts and library.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
