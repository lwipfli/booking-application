const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");
const { BigInt } = require("ethers");
//const { BigNumber }= require('bignumber.js');

describe("BookingContract", function () {
  async function deployLibraryTestFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Lib = await ethers.getContractFactory("BookingLib");
    const lib = await Lib.deploy();
    await lib.deployed();
    const libraryTestContract = await ethers.getContractFactory("LibraryTest", {
      signer: owner[0],
      libraries: {
        BookingLib: lib.address,
      },
    });
    provider = ethers.provider;
    const libTest = await libraryTestContract.deploy();
    await libTest.deployed();

    return { libTest, owner, otherAccount };
  }

  async function deployBasicFixture() {
    const bookingDateTimestamp = new Date("09/19/2022 10:58:13").getTime();

    const [owner, otherAccount] = await ethers.getSigners();

    const Lib = await ethers.getContractFactory("BookingLib");
    const lib = await Lib.deploy();
    await lib.deployed();

    const BookingContract = await ethers.getContractFactory("BookingContract", {
      signer: owner[0],
      libraries: {
        BookingLib: lib.address,
      },
    });
    provider = ethers.provider;
    const booking = await BookingContract.deploy();
    await booking.deployed();

    return { booking, owner, otherAccount, bookingDateTimestamp, lib };
  }

  async function OneRoomPostedFixture() {
    const { booking, owner, otherAccount, bookingDateTimestamp } =
      await loadFixture(deployBasicFixture);

    await booking
      .connect(otherAccount)
      .postRoom(
        ethers.utils.parseUnits("50", 18),
        0,
        20,
        "TestURI",
        50,
        false,
        false
      );
    return { booking, owner, otherAccount, bookingDateTimestamp };
  }

  async function OneRoomBookedFixture() {
    const { booking, owner, otherAccount, bookingDateTimestamp } =
      await loadFixture(OneRoomPostedFixture);
    // Overwrite timestamp with current time for cehck in/ out tests
    const newBookingDateTimestamp = (await time.latest()) + 86400;

    // Owner books the room from now to three days time
    await booking.connect(owner).bookRoom(0, newBookingDateTimestamp, 3, {
      value: ethers.utils.parseUnits("6.0", 1), // 60 gwei for 3 days stay
    });

    return { booking, owner, otherAccount, newBookingDateTimestamp };
  }

  async function OneRoomCheckedInFixture() {
    const { booking, owner, otherAccount, newBookingDateTimestamp } =
      await loadFixture(OneRoomBookedFixture);
    await time.increaseTo(newBookingDateTimestamp + 86400);

    await booking.connect(owner).checkIn(0, {
      value: ethers.utils.parseUnits("10.0", 0), // 5 gwei
    });

    return { booking, owner, otherAccount, newBookingDateTimestamp };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { booking, owner } = await loadFixture(deployBasicFixture);

      expect(await booking.owner()).to.equal(owner.address);
    });
  });

  describe("Room posting", function () {
    it("Room posting successful", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      expect(await booking.getNumberOfRooms()).to.equal(0);

      expect(
        (await booking.getRoomsByOwner(otherAccount.address)).length
      ).to.equal(0);

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("5", 18),
            0,
            20,
            "TestURI",
            50,
            false,
            false
          )
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(
          0,
          otherAccount.address,
          20,
          ethers.utils.parseUnits("5", 18),
          0,
          "None",
          "TestURI"
        );

      expect(await booking.getNumberOfRooms()).to.equal(1);

      expect(
        (await booking.getRoomsByOwner(otherAccount.address)).length
      ).to.equal(1);
      expect((await booking.getRoomsByOwner(otherAccount.address))[0]).to.equal(
        0
      );
    });

    it("Should revert if latitude is higher or lower than expeceted.", async function () {
      const { booking, otherAccount } = await loadFixture(deployBasicFixture);

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("-100", 18),
            0,
            20,
            "TestURI",
            50,
            false,
            false
          )
      ).to.be.revertedWithoutReason();
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("100", 18),
            0,
            20,
            "TestURI",
            50,
            false,
            false
          )
      ).to.be.revertedWithoutReason();
    });

    it("Should revert if longitude is higher or lower than expeceted.", async function () {
      const { booking, otherAccount } = await loadFixture(deployBasicFixture);

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("5", 18),
            ethers.utils.parseUnits("-200", 18),
            20,
            "TestURI",
            50,
            false,
            false
          )
      ).to.be.revertedWithoutReason();
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("5", 18),
            ethers.utils.parseUnits("500", 18),
            20,
            "TestURI",
            50,
            false,
            false
          )
      ).to.be.revertedWithoutReason();
    });
  });

  describe("Helper functions", function () {
    it("Latitude/Longitude string conversion test.", async function () {
      const { booking } = await loadFixture(deployBasicFixture);

      expect(
        await booking.convertInt256ToString(
          ethers.utils.parseUnits("50000000000000123000", 0)
        )
      ).to.equal("50.000000000000123000");

      expect(
        await booking.convertInt256ToString(
          BigNumber.from("-50045678901234567000")
        )
      ).to.equal("-50.045678901234567000");
    });
  });

  describe("Room update", function () {
    it("Room update test.", async function () {
      const { booking, otherAccount } = await loadFixture(OneRoomPostedFixture);

      var room = await booking.getRoom(0);
      expect(room.position.latitude).to.equal(
        ethers.utils.parseUnits("50", 18)
      );
      expect(room.position.longitude).to.equal(0);
      expect(room.uri).to.equal("TestURI");
      expect(room.pricePerDay).to.equal(20);
      expect(room.amenities.length).to.equal(0);
      expect(room.bookable).to.equal(true);
      expect(room.searchRadius).to.equal(50);

      await expect(
        booking
          .connect(otherAccount)
          .updateRoom(0, 25, "NewURI", 60, false, false)
      )
        .to.emit(booking, "RoomUpdated")
        .withArgs(0, 25, 60, "None", "NewURI");

      room = await booking.getRoom(0);
      expect(room.position.latitude).to.equal(
        ethers.utils.parseUnits("50", 18)
      );
      expect(room.position.longitude).to.equal(0);
      expect(room.uri).to.equal("NewURI");
      expect(room.pricePerDay).to.equal(25);
      expect(room.amenities.length).to.equal(0);
      expect(room.bookable).to.equal(true);
      expect(room.searchRadius).to.equal(60);
    });

    it("Should revert if owner is different for updating a room.", async function () {
      const { booking, owner } = await loadFixture(OneRoomPostedFixture);

      await expect(
        booking.connect(owner).updateRoom(0, 25, "NewURI", 60, false, false)
      ).to.be.revertedWith("Owner is different from one updating.");
    });

    it("Should revert if room does not exist.", async function () {
      const { booking, otherAccount } = await loadFixture(OneRoomPostedFixture);

      await expect(
        booking
          .connect(otherAccount)
          .updateRoom(1, 25, "NewURI", 60, false, false)
      ).to.be.revertedWith("Room index does not exist.");
    });
  });

  describe("Room booking.", function () {
    it("Should revert if there is no room to book with the index.", async function () {
      const { booking, otherAccount, bookingDateTimestamp } = await loadFixture(
        deployBasicFixture
      );

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1)
      ).to.be.revertedWith("Room index does not exist.");
    });

    it("Book room successfully, should increase balance of owner.", async function () {
      const { booking, owner, otherAccount, bookingDateTimestamp } =
        await loadFixture(deployBasicFixture);

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(
            ethers.utils.parseUnits("50", 18),
            0,
            4000000000000000,
            "TestURI",
            50,
            false,
            false
          )
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(
          0,
          otherAccount.address,
          4000000000000000,
          ethers.utils.parseUnits("50", 18),
          0,
          "None",
          "TestURI"
        );

      expect(await booking.connect(otherAccount).checkBalance()).to.equal(0);

      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp, 2, {
          value: ethers.utils.parseUnits("8.0", 15), // 8000000000000000 gwei
        })
      )
        .to.emit(booking, "RoomBooked")
        .withArgs(
          0,
          owner.address,
          bookingDateTimestamp,
          bookingDateTimestamp + 2 * 86400
        );

      var preBalance = await provider.getBalance(otherAccount.address);
      //console.log("Balance before withdrawing: " + preBalance.toString());
      expect(await booking.connect(otherAccount).checkBalance()).to.equal(
        8000000000000000
      );
      await booking.connect(otherAccount).withdraw();
      var postBalance = await provider.getBalance(otherAccount.address);
      expect(await booking.connect(otherAccount).checkBalance()).to.equal(0);
      //console.log("Balance after  withdrawing: " + postBalance.toString());

      // OtherAccount should have gotten payment from the contract
      expect(preBalance < postBalance);

      // Booking should be there
      var bookings = await booking.getBookings(0);
      expect(bookings.length).to.equal(1);
      expect(bookings[0].booker).to.equal(owner.address);
      expect(bookings[0].startTime).to.equal(bookingDateTimestamp);
      expect(bookings[0].endTime).to.equal(bookingDateTimestamp + 2 * 86400);
      expect(bookings[0].checkedIn).to.equal(false);
      expect(bookings[0].depot).to.equal(0);
    });

    it("Should revert if room is unbookable.", async function () {
      const { booking, otherAccount, bookingDateTimestamp } = await loadFixture(
        OneRoomPostedFixture
      );

      await expect(booking.connect(otherAccount).setRoomBookale(0, false))
        .to.emit(booking, "RoomBookabeUpdate")
        .withArgs(0, false);

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1)
      ).to.be.revertedWith("Room is not bookable at the current time.");
    });

    it("Should revert if booking for zero days.", async function () {
      const { booking, otherAccount, bookingDateTimestamp } = await loadFixture(
        OneRoomPostedFixture
      );

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 0)
      ).to.be.revertedWith("Cannot book room for zero days.");
    });

    it("Should revert booking if payment not enough.", async function () {
      const { booking, otherAccount, bookingDateTimestamp } = await loadFixture(
        OneRoomPostedFixture
      );

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1, {
          value: ethers.utils.parseUnits("1.0", 0), // 1 gwei
        })
      ).to.be.revertedWith("Payment is not enough for room.");
    });

    it("Should revert overlapping booking.", async function () {
      const { booking, owner, bookingDateTimestamp } = await loadFixture(
        OneRoomPostedFixture
      );

      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp, 2, {
          value: ethers.utils.parseUnits("40.0", 0),
        })
      )
        .to.emit(booking, "RoomBooked")
        .withArgs(
          0,
          owner.address,
          bookingDateTimestamp,
          bookingDateTimestamp + 2 * 86400
        );

      // Starting before and ending before
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp - 2, 2, {
          value: ethers.utils.parseUnits("40.0", 0),
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // Starting after and ending before
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp + 2, 1, {
          value: ethers.utils.parseUnits("20.0", 0),
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // Starting after and ending after
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp + 2, 2, {
          value: ethers.utils.parseUnits("40.0", 0),
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      //Starting before and ending after
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp - 2, 3, {
          value: ethers.utils.parseUnits("60.0", 0),
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // The same time
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp, 2, {
          value: ethers.utils.parseUnits("40.0", 0),
        })
      ).to.be.revertedWith("Room alredy booked at the time.");
    });
  });

  describe("Room bookable change.", function () {
    it("Should revert if room does not exist.", async function () {
      const { booking, otherAccount } = await loadFixture(deployBasicFixture);

      // Cannot change room bookable if no room exists.
      await expect(
        booking.connect(otherAccount).setRoomBookale(0, false)
      ).to.be.revertedWith("Room index does not exist.");
    });

    it("Should revert if someone different from owner tries to change bookable.", async function () {
      const { booking, owner } = await loadFixture(OneRoomPostedFixture);

      await expect(
        booking.connect(owner).setRoomBookale(0, false)
      ).to.be.revertedWith("Owner is different from one updating.");
    });

    it("Change room booking successfully.", async function () {
      const { booking, otherAccount } = await loadFixture(OneRoomPostedFixture);

      var room = await booking.getRoom(0);
      expect(room.bookable).to.equal(true);

      // Change room bookable successfully.
      await expect(booking.connect(otherAccount).setRoomBookale(0, false))
        .to.emit(booking, "RoomBookabeUpdate")
        .withArgs(0, false);

      room = await booking.getRoom(0);
      expect(room.bookable).to.equal(false);
      await expect(booking.connect(otherAccount).setRoomBookale(0, true))
        .to.emit(booking, "RoomBookabeUpdate")
        .withArgs(0, true);
      room = await booking.getRoom(0);
      expect(room.bookable).to.equal(true);
    });
  });

  describe("Check In functionality", function () {
    it("Should revert if room does not exist.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      // Cannot change room bookable if no room exists.
      await expect(booking.connect(owner).checkIn(1)).to.be.revertedWith(
        "Room index does not exist."
      );
    });

    it("Should revert if no booking for this owner.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      // Cannot change room bookable if no room exists.
      await expect(
        booking.connect(otherAccount).checkIn(0, {
          value: ethers.utils.parseUnits("10.0", 0), // 10 gwei
        })
      ).to.be.revertedWith("No booking for this owner.");
    });

    it("Should check in successfull.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);
      await time.increaseTo(newBookingDateTimestamp + 86400);
      var room = await booking.getRoom(0);
      // There should be no depot on the room.
      expect(room.bookings[0].depot).to.equal(0);

      await expect(
        booking.connect(owner).checkIn(0, {
          value: ethers.utils.parseUnits("10.0", 0), // 5 gwei
        })
      )
        .to.emit(booking, "RoomCheckedIn")
        .withArgs(0, owner.address);

      room = await booking.getRoom(0);
      // There should be no depot on the room.
      expect(room.bookings[0].depot).to.equal(10);
    });

    it("Should revert if already checked in.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomCheckedInFixture);

      await expect(
        booking.connect(owner).checkIn(0, {
          value: ethers.utils.parseUnits("10.0", 0), // 5 gwei
        })
      ).to.be.revertedWith("Room is already checked in by other occupant.");
    });

    it("Should revert if not enough depot.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(owner).checkIn(0, {
          value: ethers.utils.parseUnits("5.0", 0), // 5 gwei
        })
      ).to.be.revertedWith("Not enough depot.");
    });

    it("Should revert if outside of check in window.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      // Still under check in time
      await expect(
        booking.connect(owner).checkIn(0, {
          value: ethers.utils.parseUnits("10.0", 0), // 5 gwei
        })
      ).to.be.revertedWith(
        "Cannot checkin due to being outside checkin window."
      );

      // Overshot check in time
      await time.increaseTo(newBookingDateTimestamp + 432000);
      await expect(
        booking.connect(owner).checkIn(0, {
          value: ethers.utils.parseUnits("10.0", 0), // 5 gwei
        })
      ).to.be.revertedWith(
        "Cannot checkin due to being outside checkin window."
      );
    });
  });

  describe("Check out functionality", function () {
    it("Should revert if no room", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(booking.connect(owner).checkOut(1)).to.be.revertedWith(
        "Room index does not exist."
      );
    });

    it("Should revert if no booking for owner found found.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(otherAccount).checkOut(0)
      ).to.be.revertedWith("No booking for this owner.");
    });

    it("Should revert if not checked in.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(booking.connect(owner).checkOut(0)).to.be.revertedWith(
        "Room has not been checked in."
      );
    });

    it("Room checkout successfull.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomCheckedInFixture);

      // Create second booking 5 days later
      await booking
        .connect(otherAccount)
        .bookRoom(0, newBookingDateTimestamp + 432000, 1, {
          value: ethers.utils.parseUnits("2.0", 1), // 60 gwei for 3 days stay
        });

      var previousContractBalance = await booking.connect(owner).checkBalance();
      expect(previousContractBalance).to.equals(0);

      var bookings = await booking.getBookings(0);
      expect(bookings.length).to.equal(2);

      var room = await booking.getRoom(0);
      // There should be depot on the room.
      expect(room.bookings[0].depot).to.equal(10);

      await expect(booking.connect(owner).checkOut(0))
        .to.emit(booking, "RoomCheckedOut")
        .withArgs(0, owner.address);

      // Check remaining booking
      bookings = await booking.getBookings(0);
      expect(bookings.length).to.equal(1);
      expect(bookings[0].startTime).to.equal(newBookingDateTimestamp + 432000);
      expect(bookings[0].endTime).to.equal(newBookingDateTimestamp + 518400);
      expect(bookings[0].booker).to.equal(otherAccount.address);

      previousContractBalance = await booking.connect(owner).checkBalance();
      expect(previousContractBalance).to.equals(10);
    });
  });

  describe("Forcefull eviction functionality", function () {
    it("Should revert if no room", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(owner).forceFullEviction(1, 1)
      ).to.be.revertedWith("Room index does not exist.");
    });

    it("Should revert if not owner room", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(owner).forceFullEviction(0, 0)
      ).to.be.revertedWith("Not owner of room.");
    });

    it("Should revert if booking does not exist.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(otherAccount).forceFullEviction(0, 1)
      ).to.be.revertedWith("Booking does not exist.");
    });

    it("Should revert if room is not occupied.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomBookedFixture);

      await expect(
        booking.connect(otherAccount).forceFullEviction(0, 0)
      ).to.be.revertedWith("Room is not occupied.");
    });

    it("Should revert if not enough time has passed for eviction.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomCheckedInFixture);

      await expect(
        booking.connect(otherAccount).forceFullEviction(0, 0)
      ).to.be.revertedWith("Not enough time passed for eviction.");
    });

    it("Forcefull eviction successfull.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(OneRoomCheckedInFixture);

      var previousContractBalance = await booking
        .connect(otherAccount)
        .checkBalance();
      expect(previousContractBalance).to.equals(60);

      //Wait three days and a half
      await time.increaseTo(
        newBookingDateTimestamp + 86400 + 86400 + 43200 + 86400
      );

      await expect(booking.connect(otherAccount).forceFullEviction(0, 0))
        .to.emit(booking, "RoomCheckedOut")
        .withArgs(0, owner.address);

      previousContractBalance = await booking
        .connect(otherAccount)
        .checkBalance();
      expect(previousContractBalance).to.equals(70);
    });
  });

  describe("Search distance.", function () {
    it("Should have the default value after deployment.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(deployBasicFixture);

      expect(await booking.connect(otherAccount).getSearchDistance()).to.equal(
        500
      );
    });

    it("Should revert if the caller is not the owner.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(deployBasicFixture);

      await expect(
        booking.connect(otherAccount).updateSearchDistance(10000)
      ).to.be.revertedWithoutReason();
    });

    it("Should update successfully.", async function () {
      const { booking, owner, otherAccount, newBookingDateTimestamp } =
        await loadFixture(deployBasicFixture);

      await booking.connect(owner).updateSearchDistance(123456);
      expect(await booking.connect(otherAccount).getSearchDistance()).to.equal(
        123456
      );
    });
  });

  describe("Library distance computation", function () {
    it("Formula test no longitude, both values positive.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );

      console.log("For point 50,0 and 51, 0:");

      // φ1 should be roughly 0.872664626
      var phiOne = await libTest.phiRadian(ethers.utils.parseUnits("50", 18));
      console.log("PhiOne is:", phiOne);
      expect(phiOne).to.be.lessThanOrEqual(ethers.utils.parseUnits("873", 15));
      expect(phiOne).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("872", 15)
      );

      // φ2 should be roughly 0.890117919
      var phiTwo = await libTest.phiRadian(ethers.utils.parseUnits("51", 18));
      console.log("PhiTwo is:", phiTwo);
      expect(phiTwo).to.be.lessThanOrEqual(ethers.utils.parseUnits("891", 15));
      expect(phiTwo).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("890", 15)
      );

      var deltaPhi = await libTest.delta(
        ethers.utils.parseUnits("50", 18),
        ethers.utils.parseUnits("51", 18)
      );

      // Δφ should be roughly 0.017453293
      console.log("DeltaPhi is:", deltaPhi);
      expect(deltaPhi).to.be.lessThanOrEqual(
        ethers.utils.parseUnits("175", 14)
      );
      expect(deltaPhi).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("174", 14)
      );

      //Δλ should be 0
      var deltaLambda = await libTest.delta(0, 0);
      console.log("DeltaLambda is:", deltaLambda);
      expect(deltaLambda).to.be.lessThanOrEqual(0);
      expect(deltaLambda).to.be.greaterThanOrEqual(0);

      // CalculateA
      console.log("Calculating A:");
      // Term 1: Math.sin(Δφ/2)

      // Should be rougly 0.008726646
      var halfDeltaPhi = await libTest.halfRadian(
        ethers.utils.parseUnits("17453292519943295", 0)
      );

      console.log("Half of delta phi is:", halfDeltaPhi);
      expect(halfDeltaPhi).to.be.lessThanOrEqual(
        ethers.utils.parseUnits("8726647", 9)
      );
      expect(halfDeltaPhi).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("8726646", 9)
      );

      // Term1 = Sin Δφ/2 should be 0.008726535
      var sinHalfDeltaPhi = await libTest.sin(halfDeltaPhi);
      expect(sinHalfDeltaPhi).to.be.lessThanOrEqual(
        ethers.utils.parseUnits("87265", 11)
      );
      expect(sinHalfDeltaPhi).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("87264", 11)
      );

      var term1 = await libTest.calculateTerm1(
        ethers.utils.parseUnits("17453292519943295", 0)
      );

      expect(term1).to.be.equal(sinHalfDeltaPhi);
      console.log("Term 1 is:", term1);

      // Term 2 Math.cos(φ1) should roughly be 0.64278761
      var term2 = await libTest.calculateTerm2(
        ethers.utils.parseUnits("872664625997164788", 0)
      );
      console.log("Term 2 is:", term2);
      expect(term2).to.be.lessThanOrEqual(ethers.utils.parseUnits("64279", 13));
      expect(term2).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("64277", 13)
      );

      // Term 3 Math.cos(φ2) should roughly be 0.629320391
      var term3 = await libTest.calculateTerm2(phiTwo);
      console.log("Term 3 is:", term3);
      expect(term3).to.be.lessThanOrEqual(ethers.utils.parseUnits("62932", 13));
      expect(term3).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("62931", 13)
      );

      // Term 4 Math.cos(φ2) should roughly be 0
      var term4 = await libTest.calculateTerm1(deltaLambda);
      console.log("Term 4 is:", term4);
      expect(term4).to.be.equal(0);

      var a = await libTest.calculateA(phiOne, phiTwo, deltaPhi, deltaLambda);
      // should be roughly 0.000076152 but seems to be 0 due to computation perhaps.
      console.log("a is:", a);
      var distance = await libTest.computeDistanceHaversine(
        ethers.utils.parseUnits("50", 18),
        0,
        ethers.utils.parseUnits("51", 18),
        0
      );

      var c = await libTest.c(a);
      console.log("C is: ", c);
      var c = await libTest.dFromA(a);
      console.log("D from A is: ", c);

      console.log("Distance is: ", distance);
    });



  });

  describe("Trigonometry tests", function () {
    it("Trigonometry sin should be zero for Pi.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );
      var PI = await libTest.getPi();
      var sinPI = await libTest.sin(PI);
      expect(sinPI).to.be.equal(0);
    });

    it("Atan2 calculation tests.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );
      var atan = await libTest.atan2(0, ethers.utils.parseUnits("1", 18));
      console.log("Atan2 0,1 is: ", atan);
      expect(atan).to.be.equal(0);
      var atan = await libTest.atan2(BigNumber.from("1000000000000000000"), 0);
      expect(atan).to.be.lessThanOrEqual(BigNumber.from("1600000000000000000"));
      expect(atan).to.be.greaterThanOrEqual(
        BigNumber.from("1500000000000000000")
      );
      console.log("Atan2 1,0 is: ", atan);
      /*
      var atan = await libTest.atan2(BigNumber.from('1e18'), 0);
      expect(atan).to.be.lessThanOrEqual(ethers.utils.parseUnits("16", 17), 0);
      expect(atan).to.be.greaterThanOrEqual(
        ethers.utils.parseUnits("15", 17),
        0
      );
      */

    });
  });

  describe("BigNumbers tests", function () {
    it("Trigonometry sin should be zero for Pi.", async function () {
      expect(BigNumber.from(42)).to.be.equal(42);
      expect(BigNumber.from("42").mul(-1)).to.be.equal(-42);
      expect(BigNumber.from("-42")).to.be.equal(-42);
    });
  });

  /*
  describe("Haversinde distance tests", function () {
    it("50,10 , 51,15 should be distance of roughly 370.6 km.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );
      expect(BigNumber('50.0e18')).to.be.equal(ethers.utils.parseUnits("50", 18));

      expect(await libTest.computeDistanceHaversine(BigNumber('50.0e18'),BigNumber('10.0e18'),BigNumber('51.0e18'),BigNumber('15.0e18'))).to.be.equals(BigNumber('370600.0e18'));
    });

    it("-50,-10 , 51,15 should be distance of roughly 11480 km.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );

      expect(await libTest.computeDistanceHaversine(BigNumber('-50.0e18'),BigNumber('-10.0e18'),ethers.utils.parseUnits("51", 18),ethers.utils.parseUnits("15", 18))).to.be.equals(ethers.utils.parseUnits("11480000", 18));
    });

    it("50,10 , -51,-15 should be distance of roughly 11480 km.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );

      expect(await libTest.computeDistanceHaversine(ethers.utils.parseUnits("50", 18),ethers.utils.parseUnits("10", 18),-1*ethers.utils.parseUnits("51", 18),-1*ethers.utils.parseUnits("15", 18))).to.be.equals(ethers.utils.parseUnits("11480000", 18));
    });

    it("-50,-10 , -51,-15 should be distance of roughly 11480 km.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );

      expect(await libTest.computeDistanceHaversine(-1*ethers.utils.parseUnits("50", 18),-1*ethers.utils.parseUnits("10", 18),-1*ethers.utils.parseUnits("51", 18),-1*ethers.utils.parseUnits("15", 18))).to.be.equals(ethers.utils.parseUnits("370600", 18));
    });

    it("0, 180 , 0,-180 should be very small distance.", async function () {
      const { libTest, owner, otherAccount } = await loadFixture(
        deployLibraryTestFixture
      );

      expect(await libTest.computeDistanceHaversine(ethers.utils.parseUnits("180", 18),0,-1*ethers.utils.parseUnits("180", 18),0)).to.be.lessThanOrEqual(ethers.utils.parseUnits("1", 18));
    });

  });
  */

  describe("Price adaption", function () {
    //TODO
  });

  describe("Search functionality", function () {
    //TODO
  });
});
