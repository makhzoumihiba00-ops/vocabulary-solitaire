# Vocabulary Solitaire

A classic-solitaire-styled English learning card game. Draw vocabulary
cards from the deck and sort **60 English words** into **6 category
piles** — Animals, Food, Jobs, Clothes, Transport and Home (10 words
each).

## How to play

1. The deck at the top-left deals a word card face-up next to it.
2. **Drag** the word onto the matching category column — or **tap the
   word, then tap a category** (great on touch screens).
3. Correct: the card stacks onto that category's pile and the counter
   goes up. Wrong: the card shakes and returns, no penalty to progress.
4. Place all 60 words to win. Score +10 per word, with a combo bonus
   for consecutive correct answers.

## Controls

| Button | Action |
|---|---|
| New | New game with a reshuffled deck |
| Restart | Reset the game with the same deck order |
| Undo | Return the last placed card to your hand |
| Hint | Highlight the correct category for the current word |
| Sound | Mute / unmute |
| Pause | Stop the timer and hide the board |
| Full | Fullscreen |

Sound settings and your best score are saved in `localStorage`.

## Run it

No build step and no dependencies — any static file server works:

```bash
python -m http.server 8080   # or: node serve.js 8080
# then open http://localhost:8080
```

Opening `index.html` directly also works.

## Project structure

```
index.html          markup, toolbar, overlays
css/style.css       classic solitaire look, responsive sizing
js/cards.js         vocabulary data (data-driven), Fisher–Yates shuffle
js/audio.js         Web Audio sound engine (synthesised, autoplay-safe)
js/game.js          game state, layout, drag & drop, scoring, undo, win
assets/             favicon
```

To change or extend the vocabulary, edit the `CATEGORIES` array in
`js/cards.js`.
