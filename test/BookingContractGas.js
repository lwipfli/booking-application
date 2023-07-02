const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber, utils } = require("ethers");
const fetch = require("node-fetch");

describe("BookingContractGas tests", function () {
  async function deployLinkTokenFixture() {
    const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

    const tokenMockContract = await ethers.getContractFactory("LinkTokenMock");
    const tokenMock = await tokenMockContract.connect(owner).deploy();

    return { owner, otherAccount, thirdAccount, tokenMock };
  }

  async function deployMockOracleFixture() {
    const { owner, otherAccount, thirdAccount, tokenMock } = await loadFixture(
      deployLinkTokenFixture
    );

    const mockOracleContract = await ethers.getContractFactory("OracleMock");
    const oracleMock = await mockOracleContract
      .connect(owner)
      .deploy(tokenMock.address);
    await oracleMock.deployed();

    return { owner, otherAccount, thirdAccount, tokenMock, oracleMock };
  }

  async function deployBookingWithoutHelperFixture() {
    const { owner, otherAccount, thirdAccount, tokenMock, oracleMock } =
      await loadFixture(deployMockOracleFixture);

    const BookingContract = await ethers.getContractFactory(
      "ContractMockBookingWithoutHelper"
    );

    const booking = await upgrades.deployProxy(BookingContract, {
      initializer: "initialize",
      unsafeAllow: ["external-library-linking"],
    });

    await booking.deployed();

    await tokenMock
      .connect(owner)
      .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

    await tokenMock
      .connect(otherAccount)
      .approve(booking.address, ethers.utils.parseUnits("1", 17));

    await booking.chainlinkSetup(tokenMock.address, oracleMock.address);

    await booking
      .connect(otherAccount)
      .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

    return {
      owner,
      otherAccount,
      thirdAccount,
      tokenMock,
      oracleMock,
      booking,
    };
  }

  async function deployBookingWithHelperFixture() {
    const { owner, otherAccount, thirdAccount, tokenMock, oracleMock } =
      await loadFixture(deployMockOracleFixture);

    const BookingContract = await ethers.getContractFactory(
      "ContractMockBookingWithHelper"
    );

    const booking = await upgrades.deployProxy(BookingContract, {
      initializer: "initialize",
      unsafeAllow: ["external-library-linking"],
    });

    await booking.deployed();
    const currentImplAddress = await booking.getImplementationAddress();

    const HelperContract = await ethers.getContractFactory("HelperGas");

    const helper = await HelperContract.deploy(
      currentImplAddress,
      tokenMock.address,
      oracleMock.address
    );

    await tokenMock
      .connect(owner)
      .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

    await tokenMock
      .connect(otherAccount)
      .approve(helper.address, ethers.utils.parseUnits("1", 17));

    await booking.setHelper(helper.address);

    await helper
      .connect(otherAccount)
      .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

    return {
      owner,
      otherAccount,
      thirdAccount,
      tokenMock,
      oracleMock,
      booking,
      helper,
    };
  }

  describe("Functionality tests.", function () {
    it("Reqest update for room for contract without helper.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        booking,
      } = await loadFixture(deployBookingWithoutHelperFixture);

      var requID = await booking.getRequestId(1);

      expect(
        await booking
          .connect(otherAccount)
          .callMapForRoom(otherAccount.address, "50.0", "0.0", "10.0", 0)
      )
        .emit(booking, "OracleRequest")
        .withArgs(
          requID,
          otherAccount.address,
          "50.0",
          "0.0",
          "10.0",
          oracleMock.address
        );
    });

    it("Reqest update for room for contract with helper.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        booking,
        helper,
      } = await loadFixture(deployBookingWithHelperFixture);

      var requID = await helper.getRequestId(1);

      expect(
        await booking
          .connect(otherAccount)
          .callMapForRoom(otherAccount.address, "50.0", "0.0", "10.0", 0)
      )
        .emit(booking, "OracleRequest")
        .withArgs(
          requID,
          otherAccount.address,
          "50.0",
          "0.0",
          "10.0",
          oracleMock.address
        );
    });
  });
});
