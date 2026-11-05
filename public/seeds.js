/* Letters already drifting in the sea. Shared by the browser (demo mode) and the server (first-run seed). */
(function (root) {
  var SEEDS = [
    { text: "I don't know who you are, but I hope your week is softer than mine was. Drink some water. Call someone you love.", sign: "Mara, Lisbon", days: 2 },
    { text: "Today I finally quit the job that was making me small. I'm terrified and I've never felt so awake. Wish me luck?", sign: "a stranger", days: 5 },
    { text: "My grandmother used to say the sea keeps secrets for the ones who ask kindly. So here is mine: I still sleep with the light on.", sign: "Ilan", days: 9 },
    { text: "It's 3 a.m. and the whole city is quiet except me. If you're awake too, you're not alone. I'm here. Hi.", sign: "night shift, Osaka", days: 1 },
    { text: "Tell me one small good thing that happened to you today. Mine: a stranger held a door and smiled like we'd met before.", sign: "Priya", days: 3 },
    { text: "I planted a lemon tree in a pot on my balcony. It has one flower. I named it Gerald. That's all. That's the letter.", sign: "Tomás, Valparaíso", days: 12 },
    { text: "If you're reading this, you found me before I found myself. Funny how that works.", sign: "", days: 20 },
    { text: "I'm learning the cello at 41. It sounds like a cat being betrayed. I have never been happier.", sign: "Edith", days: 7 },
    { text: "Whoever you are: I hope someone is cooking for you tonight.", sign: "Kofi, Accra", days: 4 },
    { text: "I miss my dad. He loved the ocean. A bottle was the closest thing to a phone line I could think of. Hello, Dad. Hello, stranger.", sign: "June", days: 15 },
    { text: "The stars are so loud tonight. Go look up, wherever you are. We're under the same ones, just in different rooms.", sign: "Ravi", days: 6 },
    { text: "What's a song you'd play on a long drive with no destination? I'm collecting them.", sign: "Sofia, Reykjavík", days: 8 },
    { text: "Nobody knows this yet: I'm going to be a mom in June. I wanted to tell the sea first.", sign: "Anika", days: 2 },
    { text: "I was going to write something wise. Instead: you're doing better than you think you are.", sign: "Daniel", days: 10 }
  ];
  var REPLIES = [
    { text: "Your bottle washed up beside my morning coffee. I read it twice. I hope the tide is kind to you, wherever you are.", sign: "a stranger by a window" },
    { text: "Thank you for writing. I needed someone else's voice today. Hello from the other side of the water — I'm smiling at your words.", sign: "Noor" },
    { text: "I found you at sunset, on a quiet pier. I don't know you, and yet I'm rooting for you. Truly. Keep going.", sign: "Elias" },
    { text: "What a gift to open. I'm sitting on my balcony with tea, reading you out loud to the plants. They approve.", sign: "Mei" },
    { text: "You made my whole evening. I wrote this on the back of a receipt in a café. May good winds follow you.", sign: "Tobias, Berlin" },
    { text: "Someone out here read your bottle and felt less alone. That someone is me. Thank you.", sign: "Lucía" }
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = { SEEDS: SEEDS, REPLIES: REPLIES };
  else { root.SEEDS = SEEDS; root.REPLIES = REPLIES; }
})(typeof window !== 'undefined' ? window : this);
