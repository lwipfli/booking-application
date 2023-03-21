const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");

describe("BookingContract", function () {
  async function deployBasicFixture() {
    const bookingDateTimestamp = new Date("09/19/2022 10:58:13").getTime();

    const [owner, otherAccount] = await ethers.getSigners();
    const BookingContract = await ethers.getContractFactory("BookingContract");
    provider = ethers.provider;
    const booking = await BookingContract.deploy();
    await booking.deployed();
    return { booking, owner, otherAccount, bookingDateTimestamp };
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
      ).to.be.revertedWith("Latitude is not a value between -90 and 90.");
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
      ).to.be.revertedWith("Latitude is not a value between -90 and 90.");
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
      ).to.be.revertedWith("Longitude is not a value between -180 and 180.");
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
      ).to.be.revertedWith("Longitude is not a value between -180 and 180.");
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

      // Cannot be tested due to Javascript limitations.
      /*
      expect(
        await booking.convertInt256ToString(
          ethers.utils.parseUnits("50045678901234567000", 0) * -1
        )
      ).to.equal("-50.045678901234567000");
          */
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
      ).to.be.revertedWith("Only the contract owner can use this function.");
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
  describe("Price adaption", function () {
    //TODO
  });

  describe("Search functionality", function () {
    //TODO
  });
});
