/*
	Copyright © 2024 Berny23, Cort1237 and many more

	This file is part of "Toy Pad Emulator for Lego Dimensions" which is released under the "MIT" license.
	See file "LICENSE" or go to "https://choosealicense.com/licenses/mit" for full license details.
*/

//Imports
const ld = require("node-ld");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
let isGameConnected = false; //TODO: Add disconnect event, Node-ld is missing this feature sadly.

//CONSTANTS
//TODO: Download maps if updated or missing
const CHARACTERMAP_PATH = path.join(
  __dirname,
  "server",
  "json",
  "charactermap.json"
);

const TOKENMAP_PATH = path.join(__dirname, "server", "json", "tokenmap.json");
const TOYTAGS_PATH = path.join(__dirname, "server", "json", "toytags.json");
const HEXMAP_PATH = path.join(__dirname, "server", "ressources", "hexmap.json");
const UPGRADEMAP_PATH = path.join(
  __dirname,
  "server",
  "json",
  "upgrademap.json"
);

//Setup Webserver
const app = express();
const server = http.createServer(app);
const io = new Server(server);

//File where tag info will be saved
const tp = new ld.ToyPadEmu();

tp.registerDefaults();

initalizeToyTagsJSON(); //Run in case there were any leftovers from a previous run.
initalizeCharacterDict();
initalizeVehicleDict();
initalizeHexDict();

const characters = {};
const vehicles = {};
const hexDict = {};

function initalizeHexDict() {
  const fileData = fs.readFileSync(HEXMAP_PATH, "utf8");

  try {
    const jsonOBJ = JSON.parse(fileData);
    Object.keys(jsonOBJ).forEach((key) => {
      const value = colorMapping[key];
      hexDict[key] = value[0];
    });
  } catch (ex) {
    console.error("JSON format error in hexmap.json: " + ex);
    console.log("exiting...");
    exit(2);
  }
}
function initalizeCharacterDict() {
  const fileData = fs.readFileSync(CHARACTERMAP_PATH, "utf8");

  try {
    const jsonOBJ = JSON.parse(fileData);
    jsonOBJ.forEach((character) => {
      characters[character.id] = {
        name: character.name,
        world: character.world,
        abilities: character.abilities,
      };
    });
  } catch (ex) {
    console.error("JSON format error in charactermap.json: " + ex);
    console.log("exiting...");
    exit(2);
  }
}
function initalizeVehicleDict() {
  const fileData = fs.readFileSync(TOKENMAP_PATH, "utf8");

  try {
    const jsonOBJ = JSON.parse(fileData);
    jsonOBJ.forEach((other) => {
      vehicles[other.id] = {
        upgrademap: other.upgrademap,
        rebuild: other.rebuild,
        name: other.name,
        world: other.world,
        abilities: other.abilities,
      };
    });
  } catch (e) {
    console.error("JSON format error tokenmap.json: " + e);
    console.log("exiting...");
    exit(2);
  }
}

//Create a token JSON object from provided vehicle data
/* Vehicle Data Explained:
 * All data is transfered through a series of buffers. The data from these buffers needs to written to specific points (pages) in the token's
 * buffer for it to be read properly.
 *
 * For vehicles:
 * Page 24 is the ID of the vehicle
 * Pages 23 & 25 are the upgrade data
 */

const VEH_UPGRADE_1_OFFSET = 0x8c; // (0x23 * 4)
const VEH_ID_OFFSET = 0x90; // (0x24 * 4)
const VEH_UPGRADE_2_OFFSET = 0x94; // (0x25 * 4)
const VEH_VERIFICATION_OFFSET = 0x98; //Page 26 is used for verification of somekind. (0x26 * 4)
function createVehicle(id, upgrades, uid) {
  upgrades = upgrades || [0, 0];
  const token = Buffer.alloc(180);

  token.uid = uid;

  token.writeUInt32LE(upgrades[0], VEH_UPGRADE_1_OFFSET);
  token.writeUInt16LE(id, VEH_ID_OFFSET);
  token.writeUInt32LE(upgrades[1], VEH_UPGRADE_2_OFFSET);
  token.writeUInt16BE(1, VEH_VERIFICATION_OFFSET); // Page 26 verification
  return token;
}

//Create a token JSON object from provided character data.
function createCharacter(id, uid) {
  const token = Buffer.alloc(180);
  token.uid = uid;
  token.id = id;

  return token;
}

//This finds a character or vehicles name from the ID provided.
function getNameFromID(id) {
  const object = id < 1000 ? characters[id] : vehicles[id];

  if (!object) return -1;

  return object;
}
//TODO: Write documentaion for all functions
/**
 * Retrieves a database entry by its unique identifier (UID) from a JSON file.
 *
 * @function getJSONFromUID
 * @param {string} uid - The unique identifier of the database entry to retrieve.
 * @returns The database entry corresponding to the given UID, or `undefined` if no entry is found.
 *
 * @throws Throws an error if there is a problem reading or parsing the JSON file.
 *
 * @example
 * const entry = getJSONFromUID("5");
 * if (entry) {
 *   console.log("Entry found:", entry);
 * } else {
 *   console.log("No entry found with the given UID.");
 * }
 */
function getJSONFromUID(uid) {
  const data = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(data);
  let entry;
  databases.forEach((db) => {
    if (db.uid == uid) entry = db;
  });
  return entry;
}

//This updates the pad index of a tag in toytags.json, so that info can be accessed locally.
function updatePadIndex(uid, index) {
  const data = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(data);
  databases.forEach((db) => {
    if (uid == db.uid) {
      db.index = index;
    }
  });
  fs.writeFileSync(TOYTAGS_PATH, JSON.stringify(databases, null, 4), (err) => {
    if (err) {
      console.warn("Failed to set UID: " + uid + " to index " + index);
      return;
    }
    console.log("Set UID: " + uid + " to index " + index);
  });
}

//This searches toytags.json and returns to UID of the entry with the matching index.
function getUIDFromIndex(index) {
  const data = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(data);
  const entry = databases.find((db) => index == db.index);

  if (entry) {
    return entry.uid;
  }
  return null;
}

function writeBundledJSONData(uid, bundle) {
  const tags = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(tags);

  databases.forEach((db) => {
    if (uid == db.uid) {
      bundle.forEach((data) => {
        db[data.datatype] = data.value;
      });
      return;
    }
  });
  fs.writeFileSync(TOYTAGS_PATH, JSON.stringify(databases, null, 4), (err) =>
    console.log($`Wrote bundle to toypads.json`)
  );
}
//This updates the provided datatype, of the entry with the matching uid, with the provided data.
function writeJSONData(uid, datatype, data) {
  const tags = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(tags);
  databases.forEach((db) => {
    if (uid == db.uid) {
      db[datatype] = data;
      return;
    }
  });
  fs.writeFileSync(TOYTAGS_PATH, JSON.stringify(databases, null, 4), (err) => {
    if (err) {
      console.warn($`Failed to set ${datatype} of ${uid} to ${data}`);
      return;
    }
    console.log($`Set ${datatype} of ${uid} to ${data}`);
  });
}

//This sets all saved index values to '-1' (meaning unplaced).
function initalizeToyTagsJSON() {
  const data = fs.readFileSync(TOYTAGS_PATH, "utf8");
  const databases = JSON.parse(data);
  databases.forEach((db) => {
    db.index = "-1";
  });
  fs.writeFileSync(
    TOYTAGS_PATH,
    JSON.stringify(databases, null, 4),
    function () {
      console.log("Initalized toytags.JSON");
      io.emit("refreshTokens");
    }
  );
}

function RGBToHex(r, g, b) {
  r = r.toString(16).padStart(2, "0");
  g = g.toString(16).padStart(2, "0");
  b = b.toString(16).padStart(2, "0");

  const hex = `#${r}${g}${b}`;
  //TODO: locate keystone and add to hexmap.json(too many possible values to find by hand. need help here)
  const res = hexDict[hex];

  if (res) return res;

  return hex;
}

function getUIDAtPad(index) {
  token = tp._tokens.find((t) => t.index == index);
  if (token != null) return token.uid;
  else return -1;
}

//When the game calls 'CMD_WRITE', writes the given data to the toytag in the top position.
/* Writing Tags Explained:
 * A write occurs in three seperate function calls, and will repreat until either the write is canceled in game,
 * or all three calls successfully write data.
 *
 * To appease the game all data is passed through and copied to the token in the top pad. But during this we can intercept what is being written
 * and save the data locally as well. This lets us call that data back when we want to use that tag again.
 *
 * payload[1] tells what page is being written, and everything after is the data.
 * page 24 - ID
 * page 23 - Vehicle Upgrade Pt 1
 * page 26 - Vehicle Upgrades Pt 2
 * **When writing the pages requested for the write are sometimes ofset by 12, not sure why.
 *
 * This data is copied to the JSON for future use.
 */

tp.hook(tp.CMD_WRITE, (req, res) => {
  const ind = req.payload[0];
  const page = req.payload[1];
  const data = req.payload.slice(2);
  const uid = getUIDFromIndex("2");
  console.log("REQUEST (CMD_WRITE): index:", ind, "page", page, "data", data);

  //ID is stored at page 24
  if (page == 24 || page == 36) {
    const id = data.readInt16LE(0);
    const name = getNameFromID(id);
    const bundle = [
      { datatype: "id", value: id },
      { datatype: "name", value: name == -1 ? "test" : name },
      { datatype: "type", value: "vehicle" },
      //{ datatype: "uid", value: tp.randomUID() },
    ];
    writeBundledJSONData(uid, bundle);
  }
  //Vehicle uprades are stored in Pages 23 & 25
  else if (page == 23 || page == 35)
    writeJSONData(uid, "vehicleUpgradesP23", data.readUInt32LE(0));
  else if (page == 25 || page == 37) {
    writeJSONData(uid, "vehicleUpgradesP25", data.readUInt32LE(0));
    io.emit("refreshTokens"); //Refreshes the html's tag gui.
  }

  res.payload = Buffer.from("00", "hex");

  const token = tp._tokens.find((t) => t.index == ind);
  if (token) {
    req.payload.copy(token.token, 4 * page, 2, 6);
  }
});

//Colors
tp.hook(tp.CMD_COL, (req, res) => {
  console.log("    => CMD_COL");
  console.log("    => pad:", req.payload[0]);
  console.log("    => R:", req.payload[1]);
  console.log("    => G:", req.payload[2]);
  console.log("    => B:", req.payload[3]);
  const pad_number = req.payload[0];
  const pad_color = RGBToHex(req.payload[1], req.payload[2], req.payload[3]);
  if (pad_number == 0) io.emit("Color All", [pad_color, pad_color, pad_color]);
  else io.emit("Color One", [pad_number, pad_color]);
});

tp.hook(tp.CMD_FADE, (req, res) => {
  const pad_number = req.payload[0];
  const pad_speed = req.payload[1];
  const pad_cycles = req.payload[2];
  const pad_color = RGBToHex(req.payload[3], req.payload[4], req.payload[5]);
  io.emit("Fade One", [pad_number, pad_speed, pad_cycles, pad_color]);
});

///NOT IMPLEMENTED //TODO: Implement client side
tp.hook(tp.CMD_FLASH, (req, res) => {
  console.log("    => CMD_FLASH");
  console.log("    => pad:", req.payload[0]);
  console.log("    => color duration:", req.payload[1]);
  console.log("    => white duration:", req.payload[2]);
  console.log("    => cycles:", req.payload[3]);
  console.log("    => red:", req.payload[4]);
  console.log("    => green:", req.payload[5]);
  console.log("    => blue:", req.payload[6]);
});

///NOT IMPLEMENTED //TODO: Implement client side
tp.hook(tp.CMD_FADRD, (req, res) => {
  console.log("    => CMD_FADRD - pad:", req.payload[0]);
  console.log("    => speed:", req.payload[1]);
  console.log("    => cycles:", req.payload[2]);
});

tp.hook(tp.CMD_FADAL, (req, res) => {
  const top_pad_speed = req.payload[1];
  const top_pad_cycles = req.payload[2];
  const top_pad_color = RGBToHex(
    req.payload[3],
    req.payload[4],
    req.payload[5]
  );
  const left_pad_speed = req.payload[7];
  const left_pad_cycles = req.payload[8];
  const left_pad_color = RGBToHex(
    req.payload[9],
    req.payload[10],
    req.payload[11]
  );
  const right_pad_speed = req.payload[13];
  const right_pad_cycles = req.payload[14];
  const right_pad_color = RGBToHex(
    req.payload[15],
    req.payload[16],
    req.payload[17]
  );

  io.emit("Fade All", [
    top_pad_speed,
    top_pad_cycles,
    top_pad_color,
    left_pad_speed,
    left_pad_cycles,
    left_pad_color,
    right_pad_speed,
    right_pad_cycles,
    right_pad_color,
  ]);
  // setTimeout(function(){io.emit("Fade All",
  // 					[top_pad_speed, top_pad_cycles, 'white',
  // 					 left_pad_speed, left_pad_cycles, 'white',
  // 					 right_pad_speed, right_pad_cycles, 'white'])}, 2500);
});

///NOT IMPLEMENTED///
tp.hook(tp.CMD_FLSAL, (req, res) => {
  console.log("    => CMD_FLSAL - top pad color duration:", req.payload[1]);
  console.log("    => top pad white duration:", req.payload[2]);
  console.log("    => top pad cycles:", req.payload[3]);
  console.log("    => top pad red:", req.payload[4]);
  console.log("    => top pad green:", req.payload[5]);
  console.log("    => top pad blue:", req.payload[6]);
  console.log("    => left pad color duration:", req.payload[8]);
  console.log("    => left pad white duration:", req.payload[9]);
  console.log("    => left pad cycles:", req.payload[10]);
  console.log("    => left pad red:", req.payload[11]);
  console.log("    => left pad green:", req.payload[12]);
  console.log("    => left pad blue:", req.payload[13]);
  console.log("    => right pad color duration:", req.payload[15]);
  console.log("    => right pad white duration:", req.payload[16]);
  console.log("    => right pad cycles:", req.payload[17]);
  console.log("    => right pad red:", req.payload[18]);
  console.log("    => right pad green:", req.payload[19]);
  console.log("    => right pad blue:", req.payload[20]);
});

tp.hook(tp.CMD_COLALL, (req, res) => {
  console.log("    => CMD_COLAL");
  const top_pad_color = RGBToHex(
    req.payload[1],
    req.payload[2],
    req.payload[3]
  );
  const left_pad_color = RGBToHex(
    req.payload[5],
    req.payload[6],
    req.payload[7]
  );
  const right_pad_color = RGBToHex(
    req.payload[9],
    req.payload[10],
    req.payload[11]
  );

  io.emit("Color All", [top_pad_color, left_pad_color, right_pad_color]);
});

///DEBUG PURPOSES///
tp.hook(tp.CMD_GETCOL, (req, res) => {
  console.log("    => CMD_GETCOL");
  console.log("    => pad:", req.payload[0]);
});

tp.hook(tp.CMD_WAKE, (req, res) => {
  isGameConnected = true;
  io.emit("connectionConfirmation");
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "server")));

//**Website requests**//
app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "server/index.html"));
});
app.get("/main.css", (request, response) => {
  response.sendFile(path.join(__dirname, "server/main.css"));
});
app.get("/main.js", (request, response) => {
  response.sendFile(path.join(__dirname, "server/main.js"));
});
//Create a new Character and save that data to toytags.json
app.post("/character", (request, response) => {
  const uid = tp.randomUID();

  const name = getNameFromID(request.body.id);

  if (name == -1) {
    console.warn("Client send invalid tag id!");
    response.sendStatus(400);
    return;
  }

  const character = createCharacter(request.body.id, uid);

  console.log(`Created character: ${name}:${character.uid}:${character.id}`);

  fs.readFile(TOYTAGS_PATH, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }

    const tags = JSON.parse(data);

    tags.push({
      name,
      id: character.id,
      uid: character.uid,
      index: -1,
      type: 1, //1 = Character, 2 = Vehicle
      vehicleUpgradesP23: 0,
      vehicleUpgradesP25: 0,
    });

    fs.writeFile(TOYTAGS_PATH, JSON.stringify(tags, null, 4), "utf8", (err) => {
      if (err) {
        console.log(`Error writing file: ${err}`);
      } else {
        console.log(`File is written successfully!`);
      }
    });
  });

  console.log("Character created: " + request.body.id);
  response.send();
});

//This is called when a token is placed or move onto a position on the toypad.
app.post("/tagPlace", (request, response) => {
  console.log("Placing tag: " + request.body.id);
  const entry = getJSONFromUID(request.body.uid);

  //console.log(entry.type);

  //Character
  if (isCharacter(entry.id)) {
    const character = createCharacter(request.body.id, request.body.uid);
    const position = request.body.position;

    tp.place(character, position, request.body.index, character.uid);

    console.log("Character tag: " + request.body.id);
    updatePadIndex(character.uid, request.body.index);
    response.send();
    return;
  }
  const vehicle = createVehicle(
    request.body.id,
    [entry.vehicleUpgradesP23, entry.vehicleUpgradesP25],
    request.body.uid
  );
  tp.place(vehicle, request.body.position, request.body.index, vehicle.uid);
  console.log(`Placed Vehicle "${vehicle.uid} at position: ${position}"`);
  updatePadIndex(vehicle.uid, request.body.index);
  response.send();
});

app.post("/vehicle", (request, response) => {
  const vehicleID = request.body.id;

  if (!vehicleID) {
    response.sendStatus(400);
    return;
  }
  console.log("Creating vehicle: " + vehicleID);
  var uid = tp.randomUID();
  var vehicle = createVehicle(vehicleID, [0xefffffff, 0xefffffff], uid);
  const name = getNameFromID(vehicleID, "vehicle");

  if (name == -1) {
    console.warn("Client send invalid tag id!");
    response.sendStatus(404);
    return;
  }

  console.log("name: " + name, " uid: " + vehicle.uid, " id: " + vehicle.id);

  fs.readFile(TOYTAGS_PATH, "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const tags = JSON.parse(data.toString());
      var entry = {
        name: name,
        id: request.body.id,
        uid: vehicle.uid,
        index: "-1",
        type: 2, //Vehicle
        vehicleUpgradesP23: 0xefffffff,
        vehicleUpgradesP25: 0xefffffff,
      };

      console.log(entry);
      tags.push(entry);

      fs.writeFile(
        TOYTAGS_PATH,
        JSON.stringify(tags, null, 4),
        "utf8",
        (err) => {
          if (err) {
            console.log(`Error writing file: ${err}`);
          } else {
            console.log(`File is written successfully!`);
          }
        }
      );
    }
  });
  console.log("Vehicle placed: " + request.body.id);
  response.send(uid);
});

//This is called when a token needs to be removed from the pad.
app.delete("/remove", (request, response) => {
  // console.log('DEBUG: pad-from-token: ', tp._tokens.filter(v => v.index == request.body.index)[0].pad);
  tp.remove(request.body.index);
  console.log("Item removed: " + request.body.index);
  updatePadIndex(request.body.uid, "-1");
  response.send(true);
});

//**IO CALLS**//
//This setups the IO connection between index.js and index.html.
io.on("connection", (socket) => {
  //Listening for 'deleteToken' call from index.html
  socket.on("deleteToken", (uid) => {
    console.log("IO Recieved: Deleting entry " + uid + " from JSON");
    const tags = fs.readFileSync(TOYTAGS_PATH, "utf8");
    const databases = JSON.parse(tags);
    let index = -1;
    let i = 0;
    databases.forEach((db) => {
      if (uid == db.uid) {
        index = i;
        return;
      }
      i++;
    });
    console.log("Entry to delete: ", index);
    if (index > -1) {
      databases.splice(index, 1);
    }
    fs.writeFileSync(
      TOYTAGS_PATH,
      JSON.stringify(databases, null, 4),
      function () {
        if (index > -1) console.log("Token not found");
        else console.log("Deleted ", uid, " from JSON");
      }
    );
    io.emit("refreshTokens");
  });

  socket.on("connectionStatus", () => {
    if (isGameConnected == true) {
      io.emit("connectionConfirmation");
    }
  });

  socket.on("syncToyPad", (pad) => {
    console.log("<<Syncing tags, one moment...>>");
    initalizeToyTagsJSON();
    for (let i = 1; i <= 7; i++) {
      uid = getUIDAtPad(i);
      if (uid != -1) {
        //console.log(uid, "is at pad #", i);
        writeJSONData(uid, "index", i);
      }
    }
    io.emit("refreshTokens");
    console.log("<<Tags are synced!>>");
  });
});

server.listen(80, () => console.log("Server running on port 80"));

function isCharacter(type) {
  return type == 1;
}
