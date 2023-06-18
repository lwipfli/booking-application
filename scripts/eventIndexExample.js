const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const assert = require("assert");

var enable_logging = false;
var transaction_queue = [];
var event_queue = [];

const BookingStatus = {
  Open: Symbol("open"),
  Refunded: Symbol("refunded"),
  CheckedIn: Symbol("checkedin"),
  CheckedOut: Symbol("checkedout"),
  Evicted: Symbol("evicted"),
};

function log(...args) {
  if (enable_logging) {
    console.log(...args);
  }
}

async function indexEventsFromTransactionQueue(index) {
  for (let h = 0; h < transaction_queue.length; h++) {
    //const transactionReceipt = await transaction_queue[h].wait();
    const transactionReceipt = await transaction_queue[h];
    let time = (
      await hre.ethers.provider.getBlock(transactionReceipt.blockNumber)
    ).timestamp;

    for (let i = 0; i < transactionReceipt.events.length; i++) {
      log(transactionReceipt.events[i].event);
      handleEvent(index, transactionReceipt.events[i], time);
    }
  }
}

async function indexEventsFromEventQueue(index) {
  for (let i = 0; i < event_queue.length; i++) {
    log(event_queue[i].event);
    let time = (await hre.ethers.provider.getBlock(event_queue[i].blockNumber))
      .timestamp;
    handleEvent(index, event_queue[i], time);
  }
}

async function handleEvent(index, Event, time) {
  switch (Event.event) {
    case "RoomPosted":
      await handleRoomPosted(index, Event, time);
      break;
    case "RoomUpdated":
      await handleRoomUpdated(index, Event, time);
      break;
    case "RoomAmenities":
      await handleAmenityUpdate(index, Event, time);
      break;

    case "RoomBookableUpdate":
      await handleRoomBookableUpdate(index, Event, time);
      break;

    case "RoomBooked":
      await handleRoomBooked(index, Event, time);
      break;

    case "RoomCheckedIn":
      await handleRoomCheckedIn(index, Event, time);
      break;

    case "RoomCheckedOut":
      await handleRoomCheckedOut(index, Event, time);
      break;

    case "RefundBooking":
      await handleRefundBooking(index, Event, time);
      break;

    case "CancelBooking":
      await handleCancelBooking(index, Event, time);
      break;

    case "OracleRequest":
      await handleOracleRequest(index, Event, time);
      break;

    case "OracleResponse":
      await handleOracleResponse(index, Event, time);
      break;

    default:
      log("Event ", Event.event, " was not handled.");
      break;
  }
}

async function handleOracleResponse(index, event, time) {
  let requestResponse = index.requestResponse.find(
    (e) => e.id == event.args[0] && e.oracleAddress == event.args[1]
  );
  requestResponse.roomIndex = event.args[2];
  requestResponse.response = event.args[3];
  requestResponse.responseTime = time;
}

async function handleOracleRequest(index, event, time) {
  index.requestResponse.push({
    id: event.args[0],
    invoker: event.args[1],
    latitudeString: event.args[2],
    longitudeString: event.args[3],
    distanceString: event.args[4],
    oracleAddress: event.args[5],
    requestTime: time,
  });
}

async function handleCancelBooking(index, event, time) {
  let room = index.rooms[event.args[0]];
  let targetBooking = room.booking.find(
    (booking) =>
      booking.startTime == event.args[2] &&
      booking.endTime == event.args[3] &&
      booking.booker == event.args[1] &&
      booking.status == BookingStatus.CheckedIn
  );
  targetBooking.status = BookingStatus.CancelBooking;
}

async function handleRefundBooking(index, event, time) {
  let room = index.rooms[event.args[0]];
  let targetBooking = room.booking.find(
    (booking) =>
      booking.startTime == event.args[2] &&
      booking.endTime == event.args[3] &&
      booking.booker == event.args[1] &&
      booking.status == BookingStatus.Open
  );
  targetBooking.status = BookingStatus.Refunded;
}

async function handleRoomCheckedOut(index, event, time) {
  let room = index.rooms[event.args[0]];
  let targetBooking = room.booking.find(
    (booking) =>
      booking.booker == event.args[1] &&
      booking.status == BookingStatus.CheckedIn
  );
  targetBooking.status = BookingStatus.CheckedOut;
  room.occupant = null;
}

async function handleRoomCheckedIn(index, event, time) {
  let room = index.rooms[event.args[0]];
  let targetBooking = room.booking.find(
    (booking) =>
      booking.startTime <= time <= booking.endTime &&
      booking.booker == event.args[1] &&
      booking.status == BookingStatus.Open
  );
  targetBooking.status = BookingStatus.CheckedIn;
  room.occupant = event.args[1];
}

async function handleRoomBooked(index, event, time) {
  let room = index.rooms[event.args[0]];
  room.bookings.push({
    booker: event.args[1],
    startTime: event.args[2],
    endTime: event.args[3],
    status: BookingStatus.Open,
  });
}

async function handleRoomBookableUpdate(index, event, time) {
  let room = index.rooms[event.args[0]];
  room.bookable = event.args[1];
  room.bookableHistory.push({
    time: (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp,
    bookable: event.args[1],
  });
}

async function handleRoomPosted(index, event, time) {
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

  room.created = time;
  room.bookings = [];
  room.amenities = "";
  room.bookable = true;
  room.occupant = null;

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

async function handleRoomUpdated(index, event, time) {
  let room = index.rooms[event.args[0]];
  room.price = event.args[1];
  room.searchDistance = event.args[2];
  room.uri = event.args[3];
  room.updateHistory.push({
    time: time,
    price: event.args[1],
    uri: event.args[3],
    searchDistance: event.args[2],
  });
}

async function handleAmenityUpdate(index, event, time) {
  let room = index.rooms[event.args[0]];
  room.amenities = event.args[1];
  room.amenityHistory.push({
    time: time,
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

  // Make sure that helper is allowed to transfer link from user
  await tokenMock
    .connect(otherAccount)
    .approve(helperMockV1.address, ethers.utils.parseUnits("1", 17));

  await helperMockV1
    .connect(otherAccount)
    .chargeLinkBalance(ethers.utils.parseUnits("1", 17));

  return {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    lib,
    booking,
    helperMockV1,
  };
}

async function indexEventsIntoObject() {
  var index = new Object();
  index.rooms = [];
  index.owners = [];
  index.requestResponse = [];
  await indexEventsFromTransactionQueue(index);
  await indexEventsFromEventQueue(index);
  return index;
}

function addEventsToQueue(events) {
  for (let h = 0; h < events.length; h++) {
    event_queue.push(events[h]);
  }
}

async function main() {
  const {
    owner,
    otherAccount,
    tokenMock,
    oracleMock,
    lib,
    booking,
    helperMockV1,
  } = await deployContracts();

  log("Deployed the contracts and library.");

  const posting = await booking
    .connect(otherAccount)
    .postRoom(ethers.utils.parseUnits("50", 18), 0, 20, "TestURI", 500, false);
  transaction_queue.push(await posting.wait());

  // Increase time by 1 seconds
  await time.increaseTo((await time.latest()) + 1000);

  const updateRoom = await booking
    .connect(otherAccount)
    .updateRoom(0, 30, "URI2", 333);
  transaction_queue.push(await updateRoom.wait());

  var reqId1 = await helperMockV1.getRequestId(1);

  const requestTransaction = await booking
    .connect(otherAccount)
    .updateAmenities(0);

  // Increase time by 1 seconds
  await time.increaseTo((await time.latest()) + 1000);

  const fullfillRequestTransaction = await oracleMock
    .connect(owner)
    .fulfillHelperRequest(reqId1, 0, 1);

  latestBlock = await hre.ethers.provider.getBlock("latest");
  events = await helperMockV1.queryFilter("*", 0, latestBlock.number);
  addEventsToQueue(events);

  const index = await indexEventsIntoObject();

  // Check the index for some information
  assert(index.rooms[0].price == 30);
  assert(index.rooms.length == 1);
  assert(index.owners.length == 1);
  assert(index.requestResponse.find((e) => e.id == reqId1));
  assert(
    index.requestResponse[0].response[0] == 0 &&
      index.requestResponse[0].response[1] == 1
  );

  log("Owners:");
  log(index.owners);

  log("Response history:");
  log(index.requestResponse);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
