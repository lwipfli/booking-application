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
                await booking.connect(otherAccount).postRoom(50, 0,  0, 0, 20, "TestURI", 50, false);
                expect(await booking.getNumberOfRooms()).to.equal(1);

        });
    });

})