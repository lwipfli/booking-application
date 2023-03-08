const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("BookingContract", function () {
  async function deployBasicFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const BookingContract = await ethers.getContractFactory("BookingContract");
    provider = ethers.provider;
    const booking = await BookingContract.deploy();
    await booking.deployed();
    return { booking, owner, otherAccount };
  }

  describe("Base functionality", function () {
    it("Should set the right owner", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      expect(await booking.owner()).to.equal(owner.address);
    });

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
          .postRoom(50, 0, 0, 0, 20, "TestURI", 50, false, false)
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(0, otherAccount.address, 20, 50, 0, 0, 0, "None", "TestURI");

      expect(await booking.getNumberOfRooms()).to.equal(1);

      expect(
        (await booking.getRoomsByOwner(otherAccount.address)).length
      ).to.equal(1);
      expect((await booking.getRoomsByOwner(otherAccount.address))[0]).to.equal(
        0
      );
    });

    it("Room posting should revert if inputs are invalid.", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(-100, 0, 0, 0, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith("Latitude is not a value between -90 and 90.");
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(100, 0, 0, 0, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith("Latitude is not a value between -90 and 90.");

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(5, 0, -200, 0, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith("Longitude is not a value between -180 and 180.");
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(5, 0, 500, 0, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith("Longitude is not a value between -180 and 180.");

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(5, 1111111111111111, 90, 0, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith(
        "Latitude precision is not of valid length. Only 15 decimal points are supported."
      );
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(5, 0, 90, 1111111111111111, 20, "TestURI", 50, false, false)
      ).to.be.revertedWith(
        "Longitude precision is not of valid length. Only 15 decimal points are supported."
      );
    });

    it("Latitude/Longitude conversion test.", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      expect(await booking.convertLatLongToString(50, 123)).to.equal(
        "50.000000000000123"
      );
      expect(
        await booking.convertLatLongToString(-50, 45678901234567)
      ).to.equal("-50.045678901234567");
    });

    it("Room update test.", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(50, 0, 0, 0, 20, "TestURI", 50, false, false)
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(0, otherAccount.address, 20, 50, 0, 0, 0, "None", "TestURI");
      var room = await booking.getRoom(0);
      expect(room.latitudeInteger).to.equal(50);
      expect(room.latitudeDecimals).to.equal(0);
      expect(room.longitude).to.equal(0);
      expect(room.longitudeDecimals).to.equal(0);
      expect(room.uri).to.equal("TestURI");
      expect(room.pricePerDay).to.equal(20);
      expect(room.amenities).to.equal("None");
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
      expect(room.latitudeInteger).to.equal(50);
      expect(room.latitudeDecimals).to.equal(0);
      expect(room.longitude).to.equal(0);
      expect(room.longitudeDecimals).to.equal(0);
      expect(room.uri).to.equal("NewURI");
      expect(room.pricePerDay).to.equal(25);
      expect(room.amenities).to.equal("None");
      expect(room.bookable).to.equal(true);
      expect(room.searchRadius).to.equal(60);

      await expect(
        booking.connect(owner).updateRoom(0, 25, "NewURI", 60, false, false)
      ).to.be.revertedWith("Owner is different from one updating.");

      await expect(
        booking
          .connect(otherAccount)
          .updateRoom(1, 25, "NewURI", 60, false, false)
      ).to.be.revertedWith("Room index does not exist.");
    });

    it("Room booking.", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      const bookingDateTimestamp = new Date("09/19/2022 10:58:13").getTime();

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1)
      ).to.be.revertedWith("Room index does not exist.");

      await expect(
        booking
          .connect(otherAccount)
          .postRoom(50, 0, 0, 0, 4000000000000000, "TestURI", 50, false, false)
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(
          0,
          otherAccount.address,
          4000000000000000,
          50,
          0,
          0,
          0,
          "None",
          "TestURI"
        );
      await expect(booking.connect(otherAccount).setRoomBookale(0, false))
        .to.emit(booking, "RoomBookabeUpdate")
        .withArgs(0, false);

      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1)
      ).to.be.revertedWith("Room is not bookable at the current time.");
      await expect(booking.connect(otherAccount).setRoomBookale(0, true))
        .to.emit(booking, "RoomBookabeUpdate")
        .withArgs(0, true);
      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 0)
      ).to.be.revertedWith("Cannot book room for zero days.");
      await expect(
        booking.connect(otherAccount).bookRoom(0, bookingDateTimestamp, 1, {
          value: ethers.utils.parseUnits("1.0", 0), // 1 gwei
        })
      ).to.be.revertedWith("Payment is not enough for room.");

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
      console.log("Balance before withdrawing: " + preBalance.toString());
      expect(await booking.connect(otherAccount).checkBalance()).to.equal(
        8000000000000000
      );
      await booking.connect(otherAccount).withdraw();
      var postBalance = await provider.getBalance(otherAccount.address);
      expect(await booking.connect(otherAccount).checkBalance()).to.equal(0);
      console.log("Balance after  withdrawing: " + postBalance.toString());

      // OtherAccount should have gotten payment from the contract
      expect(preBalance < postBalance);

      // Booking should be there
      var bookings = await booking.getBookings(0);
      expect(bookings.length).to.equal(1);
      expect(bookings[0].booker).to.equal(owner.address);
      expect(bookings[0].startTime).to.equal(bookingDateTimestamp);
      expect(bookings[0].endTime).to.equal(bookingDateTimestamp + 2 * 86400);
      expect(bookings[0].checkedIn).to.equal(false);

      // Overlapping booking should not be possible
      // Starting before and ending before
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp - 2, 2, {
          value: ethers.utils.parseUnits("8.0", 15), // 8000000000000000 gwei
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // Starting after and ending before
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp + 2, 1, {
          value: ethers.utils.parseUnits("4.0", 15), // 4000000000000000 gwei
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // Starting after and ending after
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp + 2, 2, {
          value: ethers.utils.parseUnits("8.0", 15), // 8000000000000000 gwei
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      //Starting before and ending after
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp - 2, 3, {
          value: ethers.utils.parseUnits("12.0", 15), // 12000000000000000 gwei
        })
      ).to.be.revertedWith("Room alredy booked at the time.");

      // The same time
      await expect(
        booking.connect(owner).bookRoom(0, bookingDateTimestamp, 2, {
          value: ethers.utils.parseUnits("8.0", 15), // 8000000000000000 gwei
        })
      ).to.be.revertedWith("Room alredy booked at the time.");
    });

    it("Change Room bookable.", async function () {
      const { booking, owner, otherAccount } = await loadFixture(
        deployBasicFixture
      );

      // Cannot change room bookable if no room exists.
      await expect(
        booking.connect(otherAccount).setRoomBookale(0, false)
      ).to.be.revertedWith("Room index does not exist.");

      // Post room
      await expect(
        booking
          .connect(otherAccount)
          .postRoom(50, 0, 0, 0, 20, "TestURI", 50, false, false)
      )
        .to.emit(booking, "RoomPosted")
        .withArgs(0, otherAccount.address, 20, 50, 0, 0, 0, "None", "TestURI");
      var room = await booking.getRoom(0);
      expect(room.bookable).to.equal(true);

      //Cannot change room bookable if room does not belong to invoker.
      await expect(
        booking.connect(owner).setRoomBookale(0, false)
      ).to.be.revertedWith("Owner is different from one updating.");

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
});
