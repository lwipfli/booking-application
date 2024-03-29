const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber, utils } = require("ethers");
const fetch = require("node-fetch");

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
    await oracleMock.deployed();

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

    const booking = await upgrades.deployProxy(BookingContract, {
      initializer: "initialize",
      unsafeAllow: ["external-library-linking"],
    });
    await booking.deployed();

    const currentImplAddress = await booking.getImplementationAddress();

    const helperMockContract = await ethers.getContractFactory("HelperV1");
    const helperMockV1 = await helperMockContract
      .connect(owner)
      .deploy(currentImplAddress, tokenMock.address, oracleMock.address);
    await helperMockV1.deployed();

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
    it("Should set the right balance", async function () {
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

      expect(await helperMockV1.owner()).to.be.equals(owner.address);
      expect(await helperMockV1.getParentContract()).to.be.equals(
        booking.address
      );
      expect(await booking.getHelper()).to.be.equals(helperMockV1.address);
    });
  });

  describe("Test helper functionality for oracle calls.", function () {
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

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(0);

      expect(requestTransaction)
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockV1, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "50.000000000000000000",
          "0",
          "500.000000000000000000",
          oracleMock.address
        );

      var storedRequest = await oracleMock.getRequest(reqId1);
      expect(helperMockV1.address).to.be.equal(storedRequest.callbackAddr);
      expect(selector).to.be.equal(storedRequest.callbackFunctionId);

      const requestTransaction2 = await oracleMock
        .connect(owner)
        .fulfillHelperRequest(reqId1, 0, 1);

      expect(requestTransaction2)
        .to.emit("OracleResponse")
        .withArgs(reqId1, helperMockV1.address, 0, [0, 1]);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.not.be.equals("None");
      expect(currentAmenities).to.be.equals("cafe");
    });

    it("Successfully update room with restaurant", async function () {
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

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(0);

      expect(requestTransaction)
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockV1, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "50.000000000000000000",
          "0",
          "500.000000000000000000",
          oracleMock.address
        );

      expect(await oracleMock.connect(owner).fulfillHelperRequest(reqId1, 1, 0))
        .to.emit("OracleResponse")
        .withArgs(reqId1, helperMockV1.address, 0, [1, 0]);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.be.equals("restaurant");
    });

    it("Successfully update room with both amenities", async function () {
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

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(0);

      expect(requestTransaction)
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockV1, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "50.000000000000000000",
          "0",
          "500.000000000000000000",
          oracleMock.address
        );

      expect(await oracleMock.connect(owner).fulfillHelperRequest(reqId1, 1, 1))
        .to.emit("OracleResponse")
        .withArgs(reqId1, helperMockV1.address, 0, [1, 1]);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.be.equals("restaurant, cafe");
    });

    it("Successfully update room with both amenities if there are more than one", async function () {
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

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(0);

      expect(requestTransaction)
        .to.emit(helperMockV1, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockV1, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "50.000000000000000000",
          "0",
          "500.000000000000000000",
          oracleMock.address
        );

      await expect(oracleMock.connect(owner).fulfillHelperRequest(reqId1, 3, 4))
        .to.emit(helperMockV1, "OracleResponse")
        .withArgs(reqId1, oracleMock.address, 0, [3, 4]);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      expect(currentAmenities).to.be.equals("restaurant, cafe");
    });

    it("Helper contract should not be changebale by others.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(prepareUpdateFixture);

      const helperMockContract = await ethers.getContractFactory("HelperV2");
      const helperMockV2 = await helperMockContract
        .connect(otherAccount)
        .deploy(booking.address, tokenMock.address, oracleMock.address);

      await expect(booking.connect(owner).setHelper(helperMockV2.address)).to.be
        .revertedWithoutReason;
    });

    it("Helper contract should successfully changed to second version, and still work with new room.", async function () {
      const {
        owner,
        otherAccount,
        thirdAccount,
        tokenMock,
        oracleMock,
        helperMockV1,
        booking,
      } = await loadFixture(prepareUpdateFixture);

      // Post second room
      await booking
        .connect(otherAccount)
        .postRoom(
          ethers.utils.parseUnits("52", 18),
          ethers.utils.parseUnits("30", 18),
          20,
          "TestURI",
          500,
          false
        );

      const helperMockContract = await ethers.getContractFactory("HelperV2");
      const helperMockV2 = await helperMockContract
        .connect(owner)
        .deploy(booking.address, tokenMock.address, oracleMock.address);

      await booking.connect(owner).setHelper(helperMockV2.address);
      helperOfBooking = await booking.getHelper();
      expect(helperOfBooking).to.be.equal(helperMockV2.address);

      await tokenMock
        .connect(otherAccount)
        .approve(helperMockV2.address, ethers.utils.parseUnits("2", 17));

      await helperMockV2
        .connect(otherAccount)
        .chargeLinkBalance(ethers.utils.parseUnits("2", 17));

      expect(await booking.getAmenitiesOfRoom(1)).to.be.equals("None");

      var reqId1 = await helperMockV2.getRequestId(1);

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(1);

      expect(requestTransaction)
        .to.emit(helperMockV2, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockV2, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "52.000000000000000000",
          "30.000000000000000000",
          "500.000000000000000000",
          oracleMock.address
        );

      var roomOfRequest = await helperMockV2.getRoomIndexOfRequest(reqId1);
      expect(roomOfRequest).to.be.equal(1);

      await expect(oracleMock.connect(owner).fulfillHelperRequest(reqId1, 1, 0))
        .to.emit(helperMockV2, "OracleResponse")
        .withArgs(reqId1, oracleMock.address, 1, [1, 0]);

      var currentAmenities = await booking.getAmenitiesOfRoom(1);
      expect(currentAmenities).to.be.equals("restaurant");

      expect(
        await helperMockV2.connect(otherAccount).checkLinkBalance()
      ).to.be.equals(ethers.utils.parseUnits("1", 17));
    });

    it("Oracle test with live api response from Overpass API.", async function () {
      const { owner, otherAccount, thirdAccount, tokenMock, oracleMock } =
        await loadFixture(deployMockOracleFixture);

      const Lib = await ethers.getContractFactory("BookingLib");
      const lib = await Lib.deploy();
      await lib.deployed();

      const BookingContract = await ethers.getContractFactory(
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

      const currentImplAddress = await booking.getImplementationAddress();

      const helperMockContract = await ethers.getContractFactory("HelperLive");
      const helperMockLive = await helperMockContract
        .connect(owner)
        .deploy(currentImplAddress, tokenMock.address, oracleMock.address);

      await booking.connect(owner).setHelper(helperMockLive.address);

      await tokenMock
        .connect(owner)
        .transfer(otherAccount.address, ethers.utils.parseUnits("3", 17));

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
        .approve(helperMockLive.address, ethers.utils.parseUnits("1", 17));
      await helperMockLive
        .connect(otherAccount)
        .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

      var reqId1 = await helperMockLive.getRequestId(1);

      const requestTransaction = await booking
        .connect(otherAccount)
        .updateAmenities(0);

      expect(requestTransaction)
        .to.emit(helperMockLive, "ChainlinkRequested")
        .withArgs(reqId1);

      expect(requestTransaction)
        .to.emit(helperMockLive, "OracleRequest")
        .withArgs(
          reqId1,
          otherAccount.address,
          "50.000000000000000000",
          "0",
          "500.000000000000000000",
          oracleMock.address
        );

      // Get API response
      var restaurantTotalHttp = await helperMockLive.getRestaurantUrl();
      var cafeTotalHttp = await helperMockLive.getCafeUrl();

      let restaurantResponse = await fetch(restaurantTotalHttp);
      let restaurantData = await restaurantResponse.json();
      var restaurantTotal = restaurantData.elements[0].tags.total;

      let cafeResponse = await fetch(cafeTotalHttp);
      let cafeData = await cafeResponse.json();
      var cafeTotal = cafeData.elements[0].tags.total;

      expect(
        await oracleMock
          .connect(owner)
          .fulfillHelperRequest(reqId1, restaurantTotal, cafeTotal)
      )
        .to.emit("OracleResponse")
        .withArgs(reqId1, helperMockLive.address, 0, [
          restaurantTotal,
          cafeTotal,
        ]);

      var currentAmenities = await booking.getAmenitiesOfRoom(0);
      if (restaurantTotal > 0 && cafeTotal > 0) {
        expect(currentAmenities).to.be.equals("restaurant, cafe");
      }
      if (restaurantTotal > 0 && cafeTotal == 0) {
        expect(currentAmenities).to.be.equals("restaurant");
      }
      if (restaurantTotal == 0 && cafeTotal > 0) {
        expect(currentAmenities).to.be.equals("cafe");
      }
      if (restaurantTotal == 0 && cafeTotal == 0) {
        expect(currentAmenities).to.be.equals("None");
      }
    });
  });
});
