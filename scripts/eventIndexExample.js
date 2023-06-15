const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

var enable_logging = true;
var transaction_queue = [];

function log(...args) {
  if (enable_logging) {
    console.log(...args);
  }
}

async function indexEvents(index) {
  for (let h = 0; h < transaction_queue.length; h++) {
    const transactionReceipt = await transaction_queue[h].wait();

    for (let i = 0; i < transactionReceipt.events.length; i++) {
      switch (transactionReceipt.events[i].event) {
        case "RoomPosted":
          await handleRoomPosted(
            index,
            transactionReceipt.events[i],
            transactionReceipt
          );
          break;
        case "RoomUpdated":
          await handleRoomUpdated(
            index,
            transactionReceipt.events[i],
            transactionReceipt
          );
          break;
        case "RoomAmenities":
          await handleAmenityUpdate(
            index,
            transactionReceipt.events[i],
            transactionReceipt
          );
          break;
        default:
          log(
            "Event ",
            transactionReceipt.events[i].event,
            " was not handled."
          );
          break;
      }
    }
  }
}

async function handleRoomPosted(index, event, receipt) {
  let room = new Object();
  room.index = event.args[0];

  // Check if owner exists
  if (!index.owners.find((element) => element.address == event.args[1])) {
    let owner = new Object();
    owner.address = event.args[1];
    owner.owned = [];
    owner.owned.push(event.args[0]);
    index.owners.push(owner);
  } else {
    let owner = index.owners.find(
      (element) => element.address == event.args[1]
    );
    owner.owned.push(event.args[0]);
  }

  room.owner = event.args[1];
  room.price = event.args[2];
  room.latitude = event.args[3];
  room.longitude = event.args[4];
  room.uri = event.args[5];
  room.searchDistance = event.args[6];

  room.created = (
    await hre.ethers.provider.getBlock(receipt.blockNumber)
  ).timestamp;
  room.bookings = [];
  room.amenities = "";
  room.bookable = true;

  room.amenityHistory = [{ time: room.created, amenities: "" }];
  room.updateHistory = [
    {
      time: room.created,
      price: event.args[2],
      uri: event.args[5],
      searchDistance: event.args[6],
    },
  ];
  room.bookableHistory = [{ time: room.created, bookable: true }];

  index.rooms.push(room);
}

async function handleRoomUpdated(index, event, receipt) {
  let room = index.rooms[event.args[0]];
  room.price = event.args[1];
  room.searchDistance = event.args[2];
  room.uri = event.args[3];
  room.updateHistory.push({
    time: (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp,
    price: event.args[1],
    uri: event.args[3],
    searchDistance: event.args[2],
  });
}

async function handleAmenityUpdate(index, event, receipt) {
  let room = index.rooms[event.args[0]];
  room.amenities = event.args[1];
  room.amenityHistory.push({
    time: (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp,
    amenities: event.args[1],
  });
}

async function deployContracts() {
  const [owner, otherAccount] = await hre.ethers.getSigners();

  const tokenMockContract = await hre.ethers.getContractFactory(
    "LinkTokenMock"
  );
  const tokenMock = await tokenMockContract.connect(owner).deploy();
  await tokenMock.deployed();

  const mockOracleContract = await hre.ethers.getContractFactory("OracleMock");
  const oracleMock = await mockOracleContract
    .connect(owner)
    .deploy(tokenMock.address);
  await oracleMock.deployed();

  const Lib = await hre.ethers.getContractFactory("BookingLib");
  const lib = await Lib.deploy();
  await lib.deployed();

  const BookingContract = await hre.ethers.getContractFactory(
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

  return { owner, otherAccount, tokenMock, oracleMock, lib, booking };
}

async function indexEventsIntoObject() {
  var index = new Object();
  index.rooms = [];
  index.owners = [];
  await indexEvents(index);
  return index;
}

async function main() {
  const { owner, otherAccount, tokenMock, oracleMock, lib, booking } =
    await deployContracts();

  log("Deployed the contracts and library.");

  const posting = await booking
    .connect(otherAccount)
    .postRoom(ethers.utils.parseUnits("50", 18), 0, 20, "TestURI", 500, false);
  transaction_queue.push(posting);

  // Increase time by 1 seconds
  await time.increaseTo((await time.latest()) + 1000);

  const updateRoom = await booking
    .connect(otherAccount)
    .updateRoom(0, 30, "URI2", 333);
  transaction_queue.push(updateRoom);

  const index = await indexEventsIntoObject();
  log(index);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
