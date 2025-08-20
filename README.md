# Tetris Game

A classic Tetris game implementation using HTML, CSS, and JavaScript. This game features a scoring system, level progression, and next piece preview.

## Features

- Classic Tetris gameplay
- Score tracking system
- Level progression (speed increases with each level)
- Next piece preview
- Ghost piece showing where the current piece will land
- Game pause functionality
- Responsive design for different screen sizes

## How to Play

1. Open the `index.html` file in your web browser
2. Click the "Start / Pause" button to begin the game
3. Use the arrow keys to control the falling pieces:
   - Left/Right arrows: Move piece horizontally
   - Down arrow: Soft drop (move down faster)
   - Up arrow: Rotate piece
   - Space bar: Hard drop (instantly drop the piece)
   - P key: Pause/Resume the game

## Scoring System

- **Piece Placement**: 10 points for each piece placed
- **Line Clears**:
  - 1 line: 40 × level points
  - 2 lines: 100 × level points
  - 3 lines: 300 × level points
  - 4 lines (Tetris): 1200 × level points
- **Soft Drop**: 1 point per cell dropped
- **Hard Drop**: 2 points per cell dropped

## Level Progression

The level increases for every 10 lines cleared. Each level increases the falling speed of the pieces, making the game progressively more challenging.

## Game Over

The game ends when a new piece cannot be placed at the top of the board. Your final score will be displayed, and you can restart the game by clicking the "Play Again" button.

## Development

This game is built using:

- HTML5 for structure
- CSS3 for styling
- JavaScript for game logic

No external libraries or frameworks are used, making it a pure vanilla JavaScript implementation.

## License

Feel free to use, modify, and distribute this game as you wish.

---

Enjoy the game!
