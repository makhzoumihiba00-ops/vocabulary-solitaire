/* ============================================================
 * Vocabulary Solitaire — cards.js
 * Data-driven vocabulary content, deck creation and shuffling.
 * Add or replace categories/words here; the game adapts as long
 * as every category has the same number of words (10 by default).
 * ============================================================ */
"use strict";

const CATEGORIES = [
  {
    id: "animals", name: "Animals", color: "#2e6fbe",
    words: ["Dog", "Cat", "Lion", "Elephant", "Horse", "Rabbit", "Monkey", "Tiger", "Sheep", "Giraffe"]
  },
  {
    id: "food", name: "Food", color: "#e2821b",
    words: ["Apple", "Bread", "Cheese", "Rice", "Banana", "Carrot", "Chicken", "Egg", "Potato", "Milk"]
  },
  {
    id: "jobs", name: "Jobs", color: "#8f54c9",
    words: ["Teacher", "Doctor", "Nurse", "Engineer", "Chef", "Driver", "Farmer", "Dentist", "Pilot", "Waiter"]
  },
  {
    id: "clothes", name: "Clothes", color: "#e0619c",
    words: ["Shirt", "Jacket", "Dress", "Trousers", "Skirt", "Socks", "Shoes", "Sweater", "Coat", "Hat"]
  },
  {
    id: "transport", name: "Transport", color: "#17a2b0",
    words: ["Bus", "Train", "Bicycle", "Motorcycle", "Car", "Taxi", "Airplane", "Boat", "Truck", "Subway"]
  },
  {
    id: "home", name: "Home", color: "#c99714",
    words: ["Sofa", "Table", "Chair", "Bed", "Lamp", "Mirror", "Pillow", "Fridge", "Wardrobe", "Carpet"]
  }
];

/* Emoji illustrations give every word a quick visual clue on its card. */
const WORD_IMAGES = {
  DOG: "🐕", CAT: "🐈", LION: "🦁", ELEPHANT: "🐘", HORSE: "🐎",
  RABBIT: "🐇", MONKEY: "🐒", TIGER: "🐅", SHEEP: "🐑", GIRAFFE: "🦒",
  APPLE: "🍎", BREAD: "🍞", CHEESE: "🧀", RICE: "🍚", BANANA: "🍌",
  CARROT: "🥕", CHICKEN: "🐔", EGG: "🥚", POTATO: "🥔", MILK: "🥛",
  TEACHER: "👩‍🏫", DOCTOR: "👨‍⚕️", NURSE: "👩‍⚕️", ENGINEER: "👷",
  CHEF: "👨‍🍳", DRIVER: "🚗", FARMER: "🧑‍🌾", DENTIST: "🦷",
  PILOT: "🧑‍✈️", WAITER: "🤵",
  SHIRT: "👕", JACKET: "🧥", DRESS: "👗", TROUSERS: "👖",
  SKIRT: "👗", SOCKS: "🧦", SHOES: "👟", SWEATER: "🧶",
  COAT: "🧥", HAT: "🎩",
  BUS: "🚌", TRAIN: "🚆", BICYCLE: "🚲", MOTORCYCLE: "🏍️",
  CAR: "🚗", TAXI: "🚕", AIRPLANE: "✈️", BOAT: "⛵",
  TRUCK: "🚚", SUBWAY: "🚇",
  SOFA: "🛋️", TABLE: "🪑", CHAIR: "🪑", BED: "🛏️", LAMP: "💡",
  MIRROR: "🪞", PILLOW: "🛏️", FRIDGE: "🧊", WARDROBE: "🚪", CARPET: "🧶"
};

/* Small inline symbols (SVG fragments, 24x24 viewBox, fill=currentColor). */
const CATEGORY_ICONS = {
  animals: '<circle cx="6.8" cy="9.4" r="2.1"/><circle cx="12" cy="7.2" r="2.1"/><circle cx="17.2" cy="9.4" r="2.1"/>' +
           '<ellipse cx="12" cy="15.4" rx="4.7" ry="3.7"/>',
  food:    '<circle cx="12" cy="14" r="6.3"/>' +
           '<path d="M12 8.4c.1-1.9 1-3 2.6-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
           '<path d="M13.4 6c1.7-.9 3.4-.5 4 .3-.8 1.1-2.4 1.4-4 .5z"/>',
  jobs:    '<rect x="3.5" y="8" width="17" height="11.5" rx="2"/>' +
           '<path d="M9.5 8V6.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
           '<path d="M3.5 12.7h17" stroke="#fff" stroke-width="1.4" opacity=".55"/>',
  clothes: '<path d="M8.2 3.2 4.8 5.8c-.5.4-.6 1.1-.2 1.6l1.5 1.9c.4.5 1.1.6 1.6.2l.8-.6V20c0 .6.4 1 1 1h5c.6 0 1-.4 1-1V8.9l.8.6c.5.4 1.2.3 1.6-.2l1.5-1.9c.4-.5.3-1.2-.2-1.6l-3.4-2.6c-.9 1.3-2.1 2-3.3 2s-2.4-.7-3.3-2z"/>',
  transport: '<path d="M5 15.6l1.5-4A2 2 0 0 1 8.4 10.1h7.2a2 2 0 0 1 1.9 1.5l1.5 4v3h-2.2l-.6-1.2H7.8l-.6 1.2H5z"/>' +
           '<circle cx="8" cy="16.9" r="1.7"/><circle cx="16" cy="16.9" r="1.7"/>' +
           '<path d="M8.9 10.9h2.3v1.9H8.3zM12.8 10.9h2.3l.6 1.9h-2.9z" fill="#fff" opacity=".55"/>',
  home:    '<path d="M12 3.2 2.8 11.3h2.5V20c0 .6.4 1 1 1h3.9v-5.3h3.6V21h3.9c.6 0 1-.4 1-1v-8.7h2.5z"/>'
};

const CATEGORY_IMAGES = {
  animals: "🐾",
  food: "🍽️",
  jobs: "💼",
  clothes: "👕",
  transport: "🚙",
  home: "🏠"
};

Object.assign(WORD_IMAGES, {
  HEAD:"🗣️", HAND:"✋", HEART:"❤️", EYE:"👁️", EAR:"👂", NOSE:"👃", FOOT:"🦶", LEG:"🦵", ARM:"💪", MOUTH:"👄",
  RIVER:"🏞️", FOREST:"🌲", MOUNTAIN:"⛰️", FLOWER:"🌸", TREE:"🌳", ROCK:"🪨", OCEAN:"🌊", LEAF:"🍃", GRASS:"🌱", CLOUD:"☁️",
  BOOK:"📖", PENCIL:"✏️", DESK:"🪑", CLASS:"🏫", PAPER:"📄", RULER:"📏", BAG:"🎒", LESSON:"📝", LIBRARY:"📚",
  FOOTBALL:"⚽", TENNIS:"🎾", SWIMMING:"🏊", RUNNING:"🏃", CYCLING:"🚴", BASKETBALL:"🏀", CRICKET:"🏏", GOLF:"⛳", BOXING:"🥊", VOLLEYBALL:"🏐",
  SUN:"☀️", RAIN:"🌧️", SNOW:"❄️", WIND:"💨", STORM:"⛈️", CLOUDY:"☁️", FOG:"🌫️", THUNDER:"⚡", FROST:"🥶", RAINBOW:"🌈",
  HAPPY:"😊", SAD:"😢", ANGRY:"😠", CALM:"😌", EXCITED:"🤩", SURPRISED:"😮", PROUD:"😎", SCARED:"😨", LONELY:"😔", KIND:"🤝",
  COMPUTER:"💻", PHONE:"📱", ROBOT:"🤖", INTERNET:"🌐", KEYBOARD:"⌨️", SCREEN:"🖥️", BATTERY:"🔋", CAMERA:"📷", LAPTOP:"💻", TABLET:"📱",
  PASSPORT:"🛂", AIRPORT:"🛫", TICKET:"🎟️", HOTEL:"🏨", SUITCASE:"🧳", MAP:"🗺️", TOURIST:"🧭", STATION:"🚉", BEACH:"🏖️", JOURNEY:"🧭",
  MEDICINE:"💊", HOSPITAL:"🏥", EXERCISE:"🏋️", VITAMIN:"💊", STOMACH:"🫃", SURGERY:"🩺", BANDAGE:"🩹", HEALTHY:"💚", CLINIC:"🏥",
  GUITAR:"🎸", PIANO:"🎹", VIOLIN:"🎻", DRUMS:"🥁", SINGER:"🎤", SONG:"🎵", CONCERT:"🎤", TRUMPET:"🎺", FLUTE:"🪈", RHYTHM:"🎶",
  PAINTING:"🎨", GARDENING:"🌻", READING:"📖", COOKING:"🍳", CHESS:"♟️", FISHING:"🎣", DANCING:"💃", WRITING:"✍️", KNITTING:"🧶", HIKING:"🥾",
  MUSEUM:"🏛️", VILLAGE:"🏘️", CITY:"🌆", CASTLE:"🏰", ISLAND:"🏝️", MARKET:"🏪", BRIDGE:"🌉", HARBOR:"⚓", PARK:"🌳"
});

Object.assign(CATEGORY_IMAGES, {
  body: "🫀", nature: "🌿", school: "🏫", sports: "🏅", weather: "🌦️", emotions: "😊",
  technology: "💻", travel: "🧳", health: "🩺", music: "🎵", hobbies: "🎨", places: "🏛️"
});

const DECKS = [
  {
    id: "everyday", name: "Everyday Vocabulary", icon: "🃏",
    categories: CATEGORIES
  },
  {
    id: "explore", name: "Explore & Learn", icon: "🌍",
    categories: [
      { id: "body", name: "Body", color: "#e56b6f", words: ["Head", "Hand", "Heart", "Eye", "Ear", "Nose", "Foot", "Leg", "Arm", "Mouth"] },
      { id: "nature", name: "Nature", color: "#4b9f6a", words: ["River", "Forest", "Mountain", "Flower", "Tree", "Rock", "Ocean", "Leaf", "Grass", "Cloud"] },
      { id: "school", name: "School", color: "#3974c6", words: ["Book", "Pencil", "Teacher", "Desk", "Class", "Paper", "Ruler", "Bag", "Lesson", "Library"] },
      { id: "sports", name: "Sports", color: "#ef8b32", words: ["Football", "Tennis", "Swimming", "Running", "Cycling", "Basketball", "Cricket", "Golf", "Boxing", "Volleyball"] },
      { id: "weather", name: "Weather", color: "#6aaed6", words: ["Sun", "Rain", "Snow", "Wind", "Storm", "Cloudy", "Fog", "Thunder", "Frost", "Rainbow"] },
      { id: "emotions", name: "Emotions", color: "#b85fc5", words: ["Happy", "Sad", "Angry", "Calm", "Excited", "Surprised", "Proud", "Scared", "Lonely", "Kind"] }
    ]
  },
  {
    id: "challenge", name: "Challenge Vocabulary", icon: "🏆",
    categories: [
      { id: "technology", name: "Technology", color: "#4d70c9", words: ["Computer", "Phone", "Robot", "Internet", "Keyboard", "Screen", "Battery", "Camera", "Laptop", "Tablet"] },
      { id: "travel", name: "Travel", color: "#d66b44", words: ["Passport", "Airport", "Ticket", "Hotel", "Suitcase", "Map", "Tourist", "Station", "Beach", "Journey"] },
      { id: "health", name: "Health", color: "#d64e61", words: ["Medicine", "Hospital", "Exercise", "Vitamin", "Doctor", "Stomach", "Surgery", "Bandage", "Healthy", "Clinic"] },
      { id: "music", name: "Music", color: "#9a62c7", words: ["Guitar", "Piano", "Violin", "Drums", "Singer", "Song", "Concert", "Trumpet", "Flute", "Rhythm"] },
      { id: "hobbies", name: "Hobbies", color: "#43a47a", words: ["Painting", "Gardening", "Reading", "Cooking", "Chess", "Fishing", "Dancing", "Writing", "Knitting", "Hiking"] },
      { id: "places", name: "Places", color: "#b08a3c", words: ["Library", "Museum", "Village", "City", "Castle", "Island", "Market", "Bridge", "Harbor", "Park"] }
    ]
  }
];

/* Fisher–Yates shuffle (returns a shuffled copy). */
function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function shuffled(arr) { return fisherYatesShuffle(arr.slice()); }

/* Build the flat list of vocabulary card objects: {id, word, cat, el}. */
function buildCards(categories = CATEGORIES) {
  const out = [];
  for (const cat of categories) {
    cat.words.forEach((w, i) => out.push({
      id: cat.id + "-" + i,
      word: w.toUpperCase(),
      cat: cat.id,
      el: null
    }));
  }
  return out;
}

/* Content sanity check used at startup and during QA. */
function validateContent() {
  const issues = [];
  if (CATEGORIES.length !== 6) issues.push("expected 6 categories, found " + CATEGORIES.length);
  const seen = new Set();
  for (const c of CATEGORIES) {
    if (c.words.length !== 10) issues.push(c.id + " has " + c.words.length + " words");
    if (new Set(c.words).size !== c.words.length) issues.push(c.id + " has duplicate words");
    for (const w of c.words) {
      if (seen.has(w)) issues.push("word appears twice: " + w);
      seen.add(w);
    }
  }
  if (seen.size !== 60) issues.push("expected 60 unique words, found " + seen.size);
  return { ok: issues.length === 0, issues, total: seen.size, categories: CATEGORIES.length };
}
