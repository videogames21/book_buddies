import "server-only";

// Short, common, child-friendly words for generated child passwords
// (UC-PAR-create-kid-account data table). 160 words, three per password, plus two
// digits: about 4 million × 100 combinations, with sign-in throttling (SEC-signin-throttling).
export const PASSWORD_WORDS = [
  "ant", "apple", "arrow", "bake", "ball", "banjo", "bark", "beach", "bean", "bear",
  "bee", "bell", "berry", "bike", "bird", "boat", "book", "boot", "bread", "brick",
  "bug", "bunny", "cake", "camel", "candy", "cape", "car", "cat", "cello", "chalk",
  "cheese", "chick", "clock", "cloud", "clown", "coat", "comet", "cookie", "corn", "cow",
  "crab", "crane", "crown", "cub", "cup", "daisy", "deer", "dino", "dog", "dolphin",
  "door", "dot", "dove", "drum", "duck", "eagle", "egg", "elk", "fern", "fig",
  "fish", "flag", "flute", "fox", "frog", "gecko", "gift", "goat", "grape", "hat",
  "hill", "hippo", "honey", "horse", "igloo", "jam", "jelly", "kite", "kiwi", "koala",
  "lake", "lamb", "lamp", "leaf", "lemon", "lily", "lime", "lion", "llama", "map",
  "maple", "melon", "milk", "mint", "moon", "moose", "moss", "mouse", "mug", "nest",
  "newt", "oak", "ocean", "olive", "orca", "otter", "owl", "panda", "park", "pear",
  "pen", "piano", "pie", "pig", "pine", "pizza", "plum", "pony", "pug", "puppy",
  "quilt", "rain", "robin", "rock", "rose", "sail", "sand", "seal", "sheep", "ship",
  "shoe", "skate", "sky", "snail", "snow", "sock", "star", "sun", "swan", "taco",
  "tiger", "toad", "train", "tree", "tulip", "turtle", "van", "violin", "wagon", "whale",
  "wind", "wolf", "yak", "yarn", "yoyo", "zebra", "zoo", "acorn", "bloom", "puddle",
] as const;
