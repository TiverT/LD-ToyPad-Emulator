const VERSION = "v1.4.1";
document.title = "Toy Pad Emulator for Lego Dimensions | " + VERSION;

const tagWorldFilterInput = document.getElementById("tag-world-filter");
const tagAbilityFilterInput = document.getElementById("tag-ability-filter");
const clearFilterBTN = document.getElementById("clear-filters");
const syncBTN = document.getElementById("sync");

//Click Events
tagAbilityFilterInput.addEventListener("click", onTagAbilityFilterInput_Click);
tagWorldFilterInput.addEventListener("click", onTagWorldFilterInput_Click);
clearFilterBTN.addEventListener("click", onClearFilterBTN_Click);
syncBTN.addEventListener("click", onSyncBTN_Click);

//Change Events
const filterInputs = document.getElementsByClassName("filter-input");

for (const element of filterInputs) {
  element.addEventListener("change", applyFilters);
}

// Pre-load character and vehicle data, since it is required for the operation of the page and there are multiple places it is used
var characters;
var vehicles;

fetch("json/charactermap.json")
  .then((response) => response.json())
  .then((data) => {
    characters = data;
  })
  .catch((error) => console.error("Error loading character data:", error));
fetch("json/tokenmap.json")
  .then((response) => response.json())
  .then((data) => {
    vehicles = data;
  })
  .catch((error) => console.error("Error loading vehicle data:", error));

setupFilterInputs();

const socket = io();
socket.emit("connectionStatus");
socket.emit("syncToyPad");

var currentMousePos = { x: -1, y: -1 };
$(document).mousemove(function (event) {
  currentMousePos.x = event.pageX;
  currentMousePos.y = event.pageY;
});

//**Drag & Drop Functions**
$("#remove-tokens").sortable({
  cancel: ".drag-disabled",
});

$(".box").sortable({
  connectWith: ".box",
  scroll: true,
  scrollSensitivity: 40,
  scrollSpeed: 10,

  helper: "clone",
  appendTo: document.getElementById("focus"),
  containment: document.getElementById("focus"),
  //cursorAt: {left: (-(($(document).width() - $(window).width())/2))},

  sort: function (event, ui) {
    ui.helper[0].style.left = currentMousePos.x - 20;
    ui.helper.css({ "list-style-type": "none" });
  },

  start: function (event, ui) {
    $("html, body").animate({ scrollTop: $(document).height() }, 500);

    // Store the starting pad number and index so we can determine when releasing the tag if it was released in the same space
    ui.item.attr("previousPadNum", ui.item.closest(".box").attr("padNum"));
    ui.item.attr("previousPadIndex", ui.item.closest(".box").attr("padIndex"));
  },

  stop: function (event, ui) {
    var parentBox = ui.item.closest(".box");
    var previousPadNum = ui.item.attr("previousPadNum");
    var newPadNum = parentBox.attr("padNum");
    var previousPadIndex = ui.item.attr("previousPadIndex");
    var newPadIndex = parentBox.attr("padIndex");

    // If moving to the same space on the Toy Pad, remove and place in the current space
    if (
      previousPadNum != -1 &&
      previousPadNum != -2 &&
      previousPadNum == newPadNum &&
      previousPadIndex == newPadIndex
    ) {
      updateToyPadPosition(
        ui.item.attr("data-uid"),
        ui.item.attr("data-id"),
        newPadNum,
        newPadIndex,
        newPadIndex
      );
    }

    ui.item.removeAttr("previousPadNum");
    ui.item.removeAttr("previousPadIndex");

    applyFilters(); //Refilter in case anything was in the search bar.
  },
  receive: function (event, ui) {
    var $this = $(this);

    if ($this.attr("id") == "remove-tokens") {
      socket.emit("deleteToken", ui.item.attr("data-uid"));
      setTimeout(function () {
        refreshToyBox();
      }, 500);
    }
    // else if($this.attr('id') == "edit-tokens") {
    // 	dialog.dialog("open");
    // 	setTimeout(function () { refreshToyBox(); }, 500)
    // }
    else if (
      $this.attr("padNum") == undefined ||
      ($this.children("li").length > 1 && $this.attr("id") != "toybox-tokens")
    )
      $(ui.sender).sortable("cancel");
    //If moving to the Toy Pox, remove tag from the game.
    else if ($this.attr("id") == "toybox-tokens") {
      removeTag(parseInt(ui.sender.attr("padIndex"), ui.item.attr("data-uid")));
    }
    //If moving from the Toy Box, place tag in the game.
    else if (ui.sender.attr("padNum") == -1) {
      var content = {
        uid: ui.item.attr("data-uid"),
        id: ui.item.attr("data-id"),
        position: $this.attr("padNum"),
        index: $this.attr("padIndex"),
      };
      console.log(content);
      placeTag(content.uid, ui.id, ui.position, ui.index);
    }
    //If moving between spaces on the Toy Pad, remove from previous space and place in new one.
    else {
      updateToyPadPosition(
        ui.item.attr("data-uid"),
        ui.item.attr("data-id"),
        $this.attr("padNum"),
        ui.sender.attr("padIndex"),
        $this.attr("padIndex")
      );
    }
  },
});

$(".box").disableSelection();

//When there is a change in the search bar
$("#name-filter").on("input", function (e) {
  applyFilters();
});
//**IO Functions**
socket.on("refreshTokens", function () {
  console.log("IO Recieved: Refresh Tokens");
  setTimeout(function () {
    refreshToyBox();
  }, 1000);
});

socket.on("Fade One", function (e) {
  console.log("IO Recieved: Fade One");
  padindexs = [[2], [1, 4, 5], [3, 6, 7]];
  pad = e[0];
  speed = e[1];
  cycles = e[2];
  color = e[3] + "80";
  console.log("FADE ONE: ", e);
  pads = padindexs[pad - 1];
  pads.forEach((element) => {
    pad = document.getElementById("toypad" + element);

    console.log("#toypad" + element + " Color: " + color);
    $("#toypad" + element)
      .animate()
      .css({ backgroundColor: color });
    setTimeout(() => {
      $("#toypad" + element)
        .animate()
        .css({ backgroundColor: pad.color });
    }, speed * 100);
  });
});

socket.on("Fade All", function (e) {
  console.log("IO Recieved: Fade All");
  padindexs = [1, 2, 3, 4, 5, 6, 7];
  speed = e[0];
  cycles = e[1];
  padindexs.forEach((element) => {
    pad = document.getElementById("toypad" + element);
    if (element == 2) var color = e[2];
    else if (element == 1 || element == 4 || element == 5) var color = e[5];
    else if (element == 3 || element == 6 || element == 7) var color = e[8];
    console.log("#toypad" + element + " Color: " + color);
    color = color + "80";
    $("#toypad" + element)
      .animate()
      .css({ backgroundColor: color });
    setTimeout(() => {
      $("#toypad" + element)
        .animate()
        .css({ backgroundColor: pad.color });
    }, speed * 100);
  });
});

socket.on("Color One", function (e) {
  console.log("IO Recieved: Color One");
  padindexs = [[2], [1, 4, 5], [3, 6, 7]];
  pad = e[0];
  color = e[1] + "80";
  console.log(color);
  pads = padindexs[pad - 1];
  pads.forEach((element) => {
    pad = document.getElementById("toypad" + element);
    pad.setAttribute("color", e[1]);
    $("#toypad" + element).css({ backgroundColor: color });
  });
});

socket.on("Color All", function (e) {
  console.log("IO Recieved: Color All");
  padindexs = [1, 2, 3, 4, 5, 6, 7];
  padindexs.forEach((element) => {
    pad = document.getElementById("toypad" + element);
    padnum = pad.padNum;
    if (element == 2) var color = e[0];
    else if (element == 1 || element == 4 || element == 5) var color = e[1];
    else if (element == 3 || element == 6 || element == 7) var color = e[2];
    pad.setAttribute("color", color);
    console.log(pad);
    color = color + "80";
    $("#toypad" + element).css({ backgroundColor: color });
  });
});

socket.on("Connection True", function (e) {
  console.log("Connection Success Recieved");
  $("#status").css({ display: "none" });
});

//**Script Functions**

function filterById(jsonObject, id) {
  return jsonObject.filter(function (jsonObject) {
    return jsonObject["id"] == id;
  })[0];
}

function filterByName(jsonObject, name) {
  return jsonObject.filter(function (jsonObject) {
    return jsonObject["name"] == name;
  })[0];
}

//Remove all token items from the lists and reread toytags.json and repopulate the lists.
function refreshToyBox() {
  //Remove All Current Tokens
  var boxes = document.querySelectorAll(".box");

  boxes.forEach(function (toybox) {
    while (
      toybox.lastChild &&
      toybox.lastChild.id != "deleteToken" &&
      toybox.lastChild.id != "colorToken"
    ) {
      toybox.removeChild(toybox.lastChild);
    }
  });

  //Reread JSON file
  $.getJSON("./json/toytags.json", function (data) {
    tags = data;
  }).done(function () {
    $.each(tags, function (i, item) {
      console.log(`ID: ${item.id}, UID: ${item.uid}`);
      if (item.name != "test" && item.index == "-1") {
        CreateAndAppendItemHtml(item, toyboxTokens);
      } else if (item.index != "-1") {
        CreateAndAppendItemHtml(item, toypad);
      }
      applyFilters();
    });
  });
}

CreateAndAppendItemHtml(0, toyboxTokens);
const toypad = document.getElementById("toypad");
const toyboxTokens = document.getElementById("toybox-tokens");
function CreateAndAppendItemHtml(item, parent) {
  const itemData =
    item.type == 1
      ? filterById(characters, item.id)
      : filterById(vehicles, item.id);

  const LI = document.createElement("li");
  LI.classList.add("item");
  LI.setAttribute("draggable", true);
  LI.setAttribute("data-name", item.name);
  LI.setAttribute("data-type", item.type);
  LI.setAttribute("data-id", item.id);
  LI.setAttribute("data-uid", item.uid);
  LI.setAttribute("data-world", item.world);
  LI.setAttribute("data-abilities", item.abilities);
  LI.addEventListener("click", onItem_Click);
  //Create Child
  var path = `images/${itemData.id}.png`;
  var url = $(location).attr("href") + "/../" + path;
  if (!fileExists(url)) {
    const H3 = document.createElement("h3");
    H3.innerText = itemData.name;

    LI.appendChild(H3);
  } else {
    const IMG = document.createElement("img");
    IMG.src = path;
    IMG.alt = itemData.name;
    IMG.classList.add("tagIMG");

    LI.appendChild(IMG);
  }

  parent.appendChild(LI);
}

function fileExists(url) {
  var http = new XMLHttpRequest();
  http.open("HEAD", url, false);
  http.send();
  return http.status != 404;
}

function updateToyPadPosition(uid, id, position, currentIndex, newIndex) {
  console.log(currentIndex);
  removeTag(parseInt(currentIndex), uid, function () {
    setTimeout(function () {
      placeTag(uid, id, position, newIndex);
    }, 500);
  });
}

//Filter the toybox to tags matching the current text of the search bar.
function applyNameFilter() {
  var text = $("#name-filter").val().toLowerCase();
  $(".item").each(function (index, item) {
    var name = $(item).text().toLowerCase();
    if (!name.includes(text)) {
      $(item).addClass("filtered");
    }
  });
}

function setupFilterInputs() {
  $.each(characters, function (i, item) {
    if (item.name != "Unknown" || item.name.includes("(unreleased)"))
      $("#character-list").append(
        '<option value="' +
          item.name +
          '" data-world="' +
          item.world +
          '" data-abilities="' +
          item.abilities +
          '">'
      );
  });

  $.each(vehicles, function (i, item) {
    if (item.name != "Unknown")
      $("#vehicle-list").append(
        '<option value="' +
          item.name +
          '" data-world="' +
          item.world +
          '" data-abilities="' +
          item.abilities +
          '">'
      );
  });

  var worlds = [];
  var ignoredWorlds = ["15", "16", "17", "18", "19", "20", "N/A", "Unknown"];
  worlds = worlds.concat(
    characters.map(function (character) {
      return character.world;
    })
  );
  worlds = worlds.concat(
    vehicles.map(function (vehicle) {
      return vehicle.world;
    })
  );
  worlds = getUniqueSortedValues(worlds);
  worlds = worlds.filter(function (world) {
    return !ignoredWorlds.includes(world);
  });

  $.each(worlds, function (i, world) {
    if (world != "Unknown")
      $("#world-list").append('<option value="' + world + '">');
  });

  var abilities = [];
  abilities = abilities.concat(
    characters.map(function (character) {
      return character.abilities.split(",");
    })
  );
  abilities = abilities.concat(
    vehicles.map(function (vehicle) {
      return vehicle.abilities.split(",");
    })
  );
  abilities = abilities.flat();
  abilities = getUniqueSortedValues(abilities);

  $.each(abilities, function (i, ability) {
    if (ability != "Unknown")
      $("#ability-list").append('<option value="' + ability + '">');
  });
}

function applyFilters() {
  clearFilters();
  applyNameFilter();
  applyWorldFilter();
  applyAbilityFilter();
}

function applyWorldFilter() {
  var world = $("#tag-world-filter").val();
  if (world != "") {
    $("#character-list option, #vehicle-list option").each(function (
      index,
      option
    ) {
      if ($(option).attr("data-world") != world) {
        $(option).prop("disabled", true);
      }
    });

    $(".item").each(function (index, item) {
      if ($(item).attr("data-world") != world) {
        $(item).addClass("filtered");
      }
    });
  }
}

function applyAbilityFilter() {
  var ability = $("#tag-ability-filter").val();
  if (ability != "") {
    $("#character-list option, #vehicle-list option").each(function (
      index,
      option
    ) {
      if (!$(option).attr("data-abilities").split(",").includes(ability)) {
        $(option).prop("disabled", true);
      }
    });

    $(".item:not(#deleteToken)").each(function (index, item) {
      if (!$(item).attr("data-abilities").split(",").includes(ability)) {
        $(item).addClass("filtered");
      }
    });
  }
}

function clearFilterInputs() {
  $("#tag-world-filter, #tag-ability-filter, #name-filter").val("");
}

function clearFilters() {
  $("#character-list option, #vehicle-list option").prop("disabled", false);
  $(".item").removeClass("filtered");
}

function getUniqueSortedValues(array) {
  return array
    .filter(function (value, index, self) {
      return self.indexOf(value) === index;
    })
    .sort(compareWithoutArticles);
}

function compareWithoutArticles(a, b) {
  var aWithoutArticles = removeArticles(a);
  var bWithoutArticles = removeArticles(b);

  if (aWithoutArticles > bWithoutArticles) {
    return 1;
  }

  if (aWithoutArticles < bWithoutArticles) {
    return -1;
  }

  return 0;
}

function removeArticles(string) {
  words = string.split(" ");
  if (words.length <= 1) {
    return string;
  }

  if (words[0] == "The") {
    return words.splice(1).join(" ");
  }

  return string;
}

$("#character-select").submit(function (e) {
  e.preventDefault();

  var name = $("#character-name").val();
  $.ajax({
    method: "POST",
    contentType: "application/json",
    url: "/character",
    data: JSON.stringify({ id: filterByName(characters, name).id }),
  }).done(function () {
    var now = Date.now();
    setTimeout(() => {
      socket.emit("syncToyPad");
      $("#character-select")[0].reset();
    }, 150);
  });
});

$("#vehicle-select").submit(function (e) {
  e.preventDefault();

  var name = $("#vehicle-name").val();
  console.log(name);
  var id = filterByName(vehicles, name).id;
  $.ajax({
    method: "POST",
    contentType: "application/json",
    url: "/vehicle",
    data: JSON.stringify({ id: id }),
  }).done(function () {
    var now = Date.now();
    var end = now + 150;
    while (now < end) {
      now = Date.now();
    }
    socket.emit("syncToyPad");
    $("#vehicle-select")[0].reset();
  });
});

const dialogForm = document.getElementById("dialog-form");
//**Customize Token**
let dialog = dialogForm.dialog({
  autoOpen: false,
  height: 400,
  width: 350,
  modal: true,
  buttons: {
    Cancel: function () {
      dialog.dialog("close");
    },
  },
  close: function () {
    form[0].reset();
    allFields.removeClass("ui-state-error");
  },
});

function onTagAbilityFilterInput_Click(e) {
  tagAbilityFilterInput.value = "";
  applyFilters();
}
function onTagWorldFilterInput_Click(e) {
  tagWorldFilterInput.value = "";
  applyFilters();
}
function onClearFilterBTN_Click(e) {
  clearFilterInputs();
  clearFilters();
}
function onItem_Click(e) {
  console.log("click! " + e.target.id);
  dialog.dialog("open");
}
function onSyncBTN_Click(e) {
  Sync();
}
function Sync() {
  socket.emit("syncToyPad");
}
function removeTag(index, uid, then) {
  fetch("/remove", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      index,
      uid,
    }),
  })
    .catch((error) => console.error("Error removing token:", error))
    .then(() => {
      if (!then) return;
      then();
    });
}
function placeTag(uid, id, position, index) {
  fetch("/tagPlace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid,
      id,
      position,
      index,
    }),
  }).catch((error) => console.error("Error placing character:", error));
}
