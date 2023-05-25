const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber, utils } = require("ethers");

describe("LowLevelCallMock", function () {
  describe("Test low level call.", function () {
    async function deployBasicsFixture() {
      const [owner, otherAccount] = await ethers.getSigners();

      const Contract1 = await ethers.getContractFactory("ContractOne");
      const contractOne = await Contract1.connect(owner).deploy();

      const Contract2 = await ethers.getContractFactory("ContractTwo");
      const contractTwo = await Contract2.connect(owner).deploy();

      const ContractAF = await ethers.getContractFactory("ContractA");
      const contractA = await ContractAF.connect(owner).deploy();

      const ContractBF = await ethers.getContractFactory("ContractB");
      const contractB = await ContractBF.connect(owner).deploy(
        contractA.address
      );

      return {
        owner,
        otherAccount,
        contractOne,
        contractTwo,
        contractA,
        contractB,
      };
    }

    it("Low level call reverts due to being unsuccessful.", async function () {
      const { owner, otherAccount, contractOne, contractTwo } =
        await loadFixture(deployBasicsFixture);

      var balance = await contractOne.connect(otherAccount).getBalance();
      expect(balance).to.be.equal(0);
      await expect(
        contractTwo
          .connect(otherAccount)
          .depositOnContractOne(contractOne.address)
      ).to.be.revertedWithoutReason();
    });

    it("Low level call is successful due to enough gas.", async function () {
      const { owner, otherAccount, contractOne, contractTwo } =
        await loadFixture(deployBasicsFixture);

      var balance = await contractOne.connect(otherAccount).getBalance();
      expect(balance).to.be.equal(0);

      await contractTwo.connect(otherAccount).deposit({
        value: ethers.utils.parseEther("1.0"),
      });

      await contractTwo
        .connect(otherAccount)
        .depositOnContractOne(contractOne.address);

      balance = await contractOne.connect(otherAccount).getBalance();
      expect(balance).to.be.equal(10);
    });

    it("Low level call is successful even if we do not send separate gas ti contract B.", async function () {
      const { owner, otherAccount, contractA, contractB } = await loadFixture(
        deployBasicsFixture
      );

      var counterA = await contractA.connect(otherAccount).getCounterA();
      var counterB = await contractA.connect(otherAccount).getCounterB();
      expect(counterA).to.be.equal(0);
      expect(counterB).to.be.equal(0);
      var selectorForIncrementOne = await contractA
        .connect(otherAccount)
        .getSelectorIncrement();

      contractB.connect(otherAccount).incrementOne(1, selectorForIncrementOne);
    });

    it("Low level call should be successful for first increment.", async function () {
      const {
        owner,
        otherAccount,
        contractOne,
        contractTwo,
        contractA,
        contractB,
      } = await loadFixture(deployBasicsFixture);

      var counterA = await contractA.connect(otherAccount).getCounterA();
      var counterB = await contractA.connect(otherAccount).getCounterB();
      expect(counterA).to.be.equal(0);
      expect(counterB).to.be.equal(0);
      var selectorForIncrementOne = await contractA
        .connect(otherAccount)
        .getSelectorIncrement();

      await contractB.connect(otherAccount).deposit({
        value: ethers.utils.parseEther("1.0"),
      });

      await contractB
        .connect(otherAccount)
        .incrementOne(1, selectorForIncrementOne);
      counterA = await contractA.connect(otherAccount).getCounterA();
      await expect(counterA).to.be.equal(1);
    });

    it("Low level call should be successful for multiple increment.", async function () {
      const {
        owner,
        otherAccount,
        contractOne,
        contractTwo,
        contractA,
        contractB,
      } = await loadFixture(deployBasicsFixture);

      var counterA = await contractA.connect(otherAccount).getCounterA();
      var counterB = await contractA.connect(otherAccount).getCounterB();
      expect(counterA).to.be.equal(0);
      expect(counterB).to.be.equal(0);
      var selectorForIncrementTwo = await contractA
        .connect(otherAccount)
        .getSelectorIncrementBoth();

      await contractB
        .connect(otherAccount)
        .incrementTwo(1, selectorForIncrementTwo);
      counterA = await contractA.connect(otherAccount).getCounterA();
      counterB = await contractA.connect(otherAccount).getCounterB();
      await expect(counterA).to.be.equal(1);
      await expect(counterB).to.be.equal(1);
    });
  });
});
