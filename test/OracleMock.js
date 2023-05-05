const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");

describe("OracleMock", function () {
  async function deployLinkTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const tokenMockContract = await ethers.getContractFactory("LinkTokenMock");
    const tokenMock = await tokenMockContract.connect(owner).deploy();

    return { owner, otherAccount, tokenMock };
  }

  async function deployMockOracleFixture() {
    const { owner, otherAccount, tokenMock } = await loadFixture(
      deployLinkTokenFixture
    );

    const mockOracleContract = await ethers.getContractFactory("OracleMock");
    const oracleMock = await mockOracleContract
      .connect(owner)
      .deploy(tokenMock.address);

    return { owner, otherAccount, tokenMock, oracleMock };
  }

  async function deployHelperFixture() {
    const { owner, otherAccount, tokenMock, oracleMock } = await loadFixture(
      deployMockOracleFixture
    );

    const helperMockContract = await ethers.getContractFactory("HelperV1");
    const helperMockV1 = await helperMockContract
      .connect(otherAccount)
      .deploy(otherAccount.address, tokenMock.address, oracleMock.address);

    await tokenMock
      .connect(owner)
      .transfer(helperMockV1.address, ethers.utils.parseUnits("3", 17));

    return { owner, otherAccount, tokenMock, oracleMock, helperMockV1 };
  }

  describe("Deployment of token mock.", function () {
    it("Should set the right owner", async function () {
      const { owner, otherAccount, tokenMock } = await loadFixture(
        deployLinkTokenFixture
      );

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
      const { owner, otherAccount, tokenMock, oracleMock, helperMockV1 } =
        await loadFixture(deployHelperFixture);
      expect(await tokenMock.balanceOf(helperMockV1.address)).to.equal(
        ethers.utils.parseUnits("3", 17)
      );
    });
  });
});
