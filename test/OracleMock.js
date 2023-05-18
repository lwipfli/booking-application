const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber, utils } = require("ethers");
const { web3 } = require("web3");

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

    await booking.connect(owner).setHelper(helperMockV1.address);

    await tokenMock
      .connect(owner)
      .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

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

  async function prepareUpdateFixture() {
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

    await tokenMock
      .connect(otherAccount)
      .approve(helperMockV1.address, ethers.utils.parseUnits("1", 17));
    await helperMockV1
      .connect(otherAccount)
      .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

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
        booking,
      } = await loadFixture(deployHelperAndBookingFixture);
      expect(await tokenMock.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseUnits("3", 17)
      );
      expect(await helperMockV1.owner()).to.be.equals(booking.address);
      expect(await booking.getHelper()).to.be.equals(helperMockV1.address);
    });
  });

  describe("Test helper for oracle calls.", function () {
    it("User should be able to charge and withdraw link from helper if allowed.", async function () {
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

      // Revert due to missing link.
      await expect(
        booking.connect(otherAccount).updateAmenities(0)
      ).to.be.revertedWithoutReason();

      expect(
        await tokenMock.allowance(otherAccount.address, helperMockV1.address)
      ).to.be.equal(0);
      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(0);
      // Make sure that helper is allowed to transfer link from user
      await tokenMock
        .connect(otherAccount)
        .approve(helperMockV1.address, ethers.utils.parseUnits("1", 17));

      expect(
        await tokenMock.allowance(otherAccount.address, helperMockV1.address)
      ).to.be.equal(ethers.utils.parseUnits("1", 17));

      expect(
        await helperMockV1.connect(otherAccount).checkLinkBalance()
      ).to.be.equal(0);

      // Charge helper with link
      await helperMockV1
        .connect(otherAccount)
        .chargeLinkBalance(ethers.utils.parseUnits("1", 17));
      expect(
        await helperMockV1.connect(otherAccount).checkLinkBalance()
      ).to.be.equal(ethers.utils.parseUnits("1", 17));

      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(
        ethers.utils.parseUnits("1", 17)
      );
      expect(await tokenMock.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseUnits("2", 17)
      );

      // Withdraw Link again
      await helperMockV1.connect(otherAccount).withdrawLink();

      expect(
        await helperMockV1.connect(otherAccount).checkLinkBalance()
      ).to.be.equal(0);
      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(0);
      expect(await tokenMock.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseUnits("3", 17)
      );
    });

    it("Helper should send not send update request if not owner of room.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(prepareUpdateFixture);

      await expect(
        booking.connect(owner).updateAmenities(0)
      ).to.be.revertedWithoutReason();
    });

    it("Helper should send update request, and oracle responds successfully to request.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(prepareUpdateFixture);

      var reqId1 = await helperMockV1.getRequestId(1);
      var selector = await helperMockV1.getFulfillSelector();

      await expect(booking.connect(otherAccount).updateAmenities(0))
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      var storedRequest = await oracleMock.getRequest(reqId1);
      expect(helperMockV1.address).to.be.equal(storedRequest.callbackAddr);
      expect(selector).to.be.equal(storedRequest.callbackFunctionId);

      await expect(oracleMock.connect(owner).fulfillHelperRequest(reqId1, 0, 1))
        .to.emit(oracleMock, "OracleRequestFulfilled")
        .withArgs(helperMockV1.address, selector, reqId1, 0, 1);

      var result = await helperMockV1.getCurrentRoomAmenities(0);
      expect(result[0]).to.be.equal(0);
      expect(result[1]).to.be.equal(1);

      var parentContractOfHelper = await helperMockV1.connect(owner).owner();
      expect(parentContractOfHelper).to.be.equal(booking.address);

      await helperMockV1.connect(owner).updateAmenities(0);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.not.be.equals("None");
      expect(currentAmenities).to.be.equals("cafe");
    });
  });
});
