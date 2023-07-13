const hre = require("hardhat");
const fetch = require("node-fetch");

// Manual request for Overpass API in Postman with URL  https://www.overpass-api.de/api/interpreter?data=[out:json];nwr["amenity"~"restaurant"](around:500,51.00000000000000000,0.00000000000000000);out%20count;
// Timings: 234ms 287ms 269ms 250ms 281ms 265ms 246ms 250ms 252ms 247ms
// Manual request for Overpass API in Postman with URL  https://www.overpass-api.de/api/interpreter?data=[out:json];nwr["amenity"~"restaurant"](around:5000,51.00000000000000000,0.00000000000000000);out%20count;
// Timings: 1076 ms  970 ms 942 ms 928 ms 1036 ms 992 ms 1109 ms 942 ms 960 ms 1046 ms
// Manual request for Overpass API in Postman with URL  https://www.overpass-api.de/api/interpreter?data=[out:json];nwr["amenity"~"restaurant"](around:50000,51.00000000000000000,0.00000000000000000);out%20count;
// Timings: 3.79s 2.87s 2.98s 2.83s 3.17s 3.13s 2.86s 3.01s 2.88s 2.90s
// Manual request for Overpass API in Postman with URL  https://www.overpass-api.de/api/interpreter?data=[out:json];nwr["amenity"~"restaurant"](around:500000,51.00000000000000000,0.00000000000000000);out%20count;
// Timings: 39.54s Not tried again

async function main() {
  // Get API response and log times

  var amenities = ["amenity", "restaurant"];
  var distance = "50000";
  var latitude = "51.00000000000000000";
  var longitude = "0.00000000000000000";

  var RequestURL =
    'https://www.overpass-api.de/api/interpreter?data=[out:json];nwr["' +
    amenities.join('"~"') +
    '"](around:' +
    [distance, latitude, longitude].join(",") +
    ");out%20count;";

  var times = 100;
  console.log("REQUEST: " + RequestURL);
  console.log("Distance " + distance);
  for (let i = 0; i < times; i++) {
    console.time("timer_" + i.toString());
    await fetch(RequestURL);
    console.timeEnd("timer_" + i.toString());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
