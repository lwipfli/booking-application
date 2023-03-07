const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("BookingContract", function(){


    async function deployBasicFixture() {

        const [owner, otherAccount] = await ethers.getSigners();
        const BookingContract = await ethers.getContractFactory("BookingContract");
        const booking = await BookingContract.deploy();
        await booking.deployed();
        return { booking, owner, otherAccount };
    }

    describe("Base functionality", function () {

        it("Should set the right owner", async function () {
            const { booking, owner, otherAccount } = await loadFixture(deployBasicFixture);

            expect(await booking.owner()).to.equal(owner.address);
        });

        it("Room posting successful", async function () {
                const { booking, owner, otherAccount } = await loadFixture(deployBasicFixture);

                expect(await booking.getNumberOfRooms()).to.equal(0);
                
                expect((await booking.getRoomsByOwner(otherAccount.address)).length).to.equal(0);

                //(uint indexed _index, address indexed owner, uint pricePerDay,int latitude, uint latitudeDecimals,int longitude, uint longitudeDecimals, string amenities, string uri)
                await expect(booking.connect(otherAccount).postRoom(50, 0,  0, 0, 20, "TestURI", 50, false, false)).to.emit(booking, "RoomPosted")
                .withArgs(
                    0,
                    otherAccount.address,
                    20,
                    50,
                    0, 
                    0, 
                    0,
                    "None",
                    "TestURI"
                    );
                
                expect(await booking.getNumberOfRooms()).to.equal(1);
                
                expect((await booking.getRoomsByOwner(otherAccount.address)).length).to.equal(1);
                expect((await booking.getRoomsByOwner(otherAccount.address))[0]).to.equal(0);

        });

        it("Room posting should revert if inputs are invalid.", async function () {
            const { booking, owner, otherAccount } = await loadFixture(deployBasicFixture);

            await expect(booking.connect(otherAccount).postRoom(-100, 0,  0, 0, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Latitude is not a value between -90 and 90."
              );
              await expect(booking.connect(otherAccount).postRoom(100, 0,  0, 0, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Latitude is not a value between -90 and 90."
              );
            
              await expect(booking.connect(otherAccount).postRoom(5, 0,  -200, 0, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Longitude is not a value between -180 and 180."
              );
              await expect(booking.connect(otherAccount).postRoom(5, 0,  500, 0, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Longitude is not a value between -180 and 180."
              );

              await expect(booking.connect(otherAccount).postRoom(5, 1111111111111111,  90, 0, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Latitude precision is not of valid length. Only 15 decimal points are supported."
              );
              await expect(booking.connect(otherAccount).postRoom(5, 0,  90, 1111111111111111, 20, "TestURI", 50, false, false)).to.be.revertedWith(
                "Longitude precision is not of valid length. Only 15 decimal points are supported."
              );

              //TODO

        });

        it("Latitude/Longitude conversion test.", async function () {
            const { booking, owner, otherAccount } = await loadFixture(deployBasicFixture);

             expect(await booking.convertLatLongToString(50,123)).to.equal("50.000000000000123");
             expect(await booking.convertLatLongToString(-50,45678901234567)).to.equal("-50.045678901234567");
        });

        it("Room update test.", async function () {
          const { booking, owner, otherAccount } = await loadFixture(deployBasicFixture);

          await expect(booking.connect(otherAccount).postRoom(50, 0,  0, 0, 20, "TestURI", 50, false, false)).to.emit(booking, "RoomPosted")
                .withArgs(
                    0,
                    otherAccount.address,
                    20,
                    50,
                    0, 
                    0, 
                    0,
                    "None",
                    "TestURI"
               );
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

          //RoomUpdated(uint indexed roomIndex, uint pricePerDay,uint searchRadius, string amenities, string uri);
          await expect(booking.connect(otherAccount).updateRoom(0, 25, "NewURI", 60, false, false)).to.emit(booking, "RoomUpdated")
          .withArgs(
            0,
            25,
            60, 
            "None",
            "NewURI", 
         );
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

          await expect(booking.connect(owner).updateRoom(0, 25, "NewURI", 60, false, false)).to.be.revertedWith(
            "Owner is different from one updating."
          );

          await expect(booking.connect(otherAccount).updateRoom(1, 25, "NewURI", 60, false, false)).to.be.revertedWith(
            "Room index does not exist."
          );
      });
      
        

    });

})