const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber, utils } = require("ethers");
const { web3 } = require("web3");

describe("OracleMock", function () {
  async function deployBasicFixture() {
    const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

    const tokenMockContract = await ethers.getContractFactory("LinkTokenMock");
    const tokenMock = await tokenMockContract.connect(owner).deploy();

    const mockOracleContract = await ethers.getContractFactory("OracleMock");
    const oracleMock = await mockOracleContract
      .connect(owner)
      .deploy(tokenMock.address);

    const Lib = await ethers.getContractFactory("BookingLib");
    const lib = await Lib.deploy();
    await lib.deployed();

    const BookingContract = await ethers.getContractFactory("BookingContract", {
      signer: otherAccount[0],
      libraries: {
        BookingLib: lib.address,
      },
    });

    const booking = await upgrades.deployProxy(BookingContract, {
      initializer: "initialize",
      unsafeAllow: ["external-library-linking"],
    });
    const currentImplAddress = await booking.getImplementationAddress();

    const helperMockContract = await ethers.getContractFactory("HelperV1");
    const helperMockV1 = await helperMockContract
      .connect(owner)
      .deploy(currentImplAddress, tokenMock.address, oracleMock.address);

    await booking.connect(owner).setHelper(helperMockV1.address);

    await tokenMock
      .connect(owner)
      .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

    // Post room 1
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
    // Post room 2
    await booking
      .connect(otherAccount)
      .postRoom(
        ethers.utils.parseUnits("60", 18),
        ethers.utils.parseUnits("20", 18),
        30,
        "TestURI2",
        500,
        true
      );

    await tokenMock
      .connect(otherAccount)
      .approve(helperMockV1.address, ethers.utils.parseUnits("2", 17));

    await helperMockV1
      .connect(otherAccount)
      .chargeLinkBalance(ethers.utils.parseUnits("2", 17));

    return {
      owner,
      otherAccount,
      thirdAccount,
      tokenMock,
      oracleMock,
      helperMockV1,
      booking,
      lib,
    };
  }

  describe("Upgrade tests.", function () {
    it("Update room, then upgrade contract and change helper parent.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
        lib,
      } = await loadFixture(deployBasicFixture);

      expect(await booking.getAmenitiesOfRoom(0)).to.be.equals("None");
      expect(await booking.getAmenitiesOfRoom(1)).to.be.equals("None");

      var reqId1 = await helperMockV1.getRequestId(1);
      var selector = await helperMockV1.getFulfillSelector();

      await expect(booking.connect(otherAccount).updateAmenities(0))
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      await expect(oracleMock.connect(owner).fulfillHelperRequest(reqId1, 1, 0))
        .to.emit(oracleMock, "OracleRequestFulfilled")
        .withArgs(helperMockV1.address, selector, reqId1, 1, 0);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.be.equals("restaurant");

      // Update contract
      const BookingV2 = await ethers.getContractFactory("BookingContractV2", {
        signer: otherAccount[0],
        libraries: {
          BookingLib: lib.address,
        },
      });

      const booking2 = await upgrades.upgradeProxy(booking.address, BookingV2, {
        initializer: "initialize",
        unsafeAllow: ["external-library-linking"],
      });

      // Check values and new functionality
      expect(await booking2.getAmenitiesOfRoom(0)).to.be.equals("restaurant");
      expect(await booking2.getAmenitiesOfRoom(1)).to.be.equals("None");
      expect(await booking2.getSymbol()).to.be.equals(""); // due to calling initialize only once
      await booking2.setSymbol("Version2");
      expect(await booking2.getSymbol()).to.be.equals("Version2");
      await helperMockV1.setParentContract(
        await booking2.getImplementationAddress()
      );

      var reqId2 = await helperMockV1.getRequestId(2);

      await expect(await helperMockV1.getParentContract()).to.be.equal(
        await booking2.getImplementationAddress()
      );

      await expect(booking2.connect(otherAccount).updateAmenities(1))
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId2);

      await expect(oracleMock.connect(owner).fulfillHelperRequest(reqId2, 1, 1))
        .to.emit(helperMockV1, "RequestFulfilled")
        .withArgs(1, reqId2, [1, 1]);

      expect(await booking2.getAmenitiesOfRoom(1)).to.be.equals(
        "restaurant, cafe"
      );
    });
  });
});
