const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");

describe("OracleMock", function () {
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

    return { owner, otherAccount, thirdAccount, tokenMock, oracleMock };
  }

  async function deployHelperAndBookingFixture() {
    const { owner, otherAccount, thirdAccount, tokenMock, oracleMock } =
      await loadFixture(deployMockOracleFixture);

    const Lib = await ethers.getContractFactory("BookingLib");
    const lib = await Lib.deploy();
    await lib.deployed();

    const BookingContract = await ethers.getContractFactory("BookingContract", {
      signer: otherAccount[0],
      libraries: {
        BookingLib: lib.address,
      },
    });
    const booking = await BookingContract.deploy();
    await booking.deployed();

    const helperMockContract = await ethers.getContractFactory("HelperV1");
    const helperMockV1 = await helperMockContract
      .connect(otherAccount)
      .deploy(booking.address, tokenMock.address, oracleMock.address);

    await tokenMock
      .connect(owner)
      .transfer(helperMockV1.address, ethers.utils.parseUnits("3", 17));

    return {
      owner,
      otherAccount,
      thirdAccount,
      tokenMock,
      oracleMock,
      helperMockV1,
      booking,
    };
  }

  describe("Deployment of token mock.", function () {
    it("Should set the right owner", async function () {
      const { owner, otherAccount, thirdAccount, tokenMock } =
        await loadFixture(deployLinkTokenFixture);

      expect(await tokenMock.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1", 27)
      );
      expect(await tokenMock.balanceOf(otherAccount.address)).to.equal(0);
    });
  });

  describe("Deployment of oracle mock.", function () {
    it("Should deploy oracle mock.", async function () {
      const { owner, otherAccount, tokenMock, oracleMock } = await loadFixture(
        deployMockOracleFixture
      );

      expect(await oracleMock.getChainlinkToken()).to.equal(tokenMock.address);
    });
  });

  describe("Deployment of helper mock.", function () {
    it("Should deploy helper mock with correct balance.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
      } = await loadFixture(deployHelperAndBookingFixture);
      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(
        ethers.utils.parseUnits("3", 17)
      );
    });
  });

  describe("Deployment of helper mock.", function () {
    it("Should deploy helper mock with correct balance.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(deployHelperAndBookingFixture);
      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(
        ethers.utils.parseUnits("3", 17)
      );
    });
  });

  describe("Test helper for racle calls.", function () {
    it("Test helper usage.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(deployHelperAndBookingFixture);

      // Post room
      await booking
        .connect(otherAccount)
        .postRoom(
          ethers.utils.parseUnits("50", 18),
          0,
          20,
          "TestURI",
          500,
          false
        );

      expect(await booking.getAmenitiesOfRoom(0)).to.be.equals("None");
    });
  });
});
