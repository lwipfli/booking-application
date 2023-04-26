const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");

describe("OracleMock", function () {
  async function deployBaseFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const tokenContract = await ethers.getContractFactory("LinkTokenMock");
    const tokenMock = await tokenContract.connect(owner).deploy();

    return { owner, otherAccount, tokenMock };
  }

  describe("Deployment of token mock.", function () {
    it("Should set the right owner", async function () {
      const { owner, otherAccount, tokenMock } = await loadFixture(
        deployBaseFixture
      );

      expect(await tokenMock.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1", 27)
      );
      expect(await tokenMock.balanceOf(otherAccount.address)).to.equal(0);
    });
  });
});
