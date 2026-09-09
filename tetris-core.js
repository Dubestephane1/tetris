/* =========================================
   BELLA TETRIS - CORE LOGIC (pure, no DOM)
   Shared by tetris.js (browser global) and
   unit tests (Node via module.exports).
   ========================================= */
(function (global) {
    'use strict';

    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;

    // Tetromino shapes and their rotations
    const TETROMINOES = {
        I: {
            shape: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            color: 'I'
        },
        J: {
            shape: [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: 'J'
        },
        L: {
            shape: [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: 'L'
        },
        O: {
            shape: [
                [1, 1],
                [1, 1]
            ],
            color: 'O'
        },
        S: {
            shape: [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            color: 'S'
        },
        T: {
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: 'T'
        },
        Z: {
            shape: [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ],
            color: 'Z'
        }
    };

    // Fisher-Yates shuffle on a copy
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // 7-bag: returns an array of the 7 piece types in random order
    function makeBag() {
        return shuffle(Object.keys(TETROMINOES));
    }

    // Create a fresh piece object from a type key
    function createPiece(type) {
        return {
            type: type,
            shape: TETROMINOES[type].shape,
            color: TETROMINOES[type].color
        };
    }

    // Draw the next piece from the given bag array, refilling with a new
    // 7-bag when empty. Mutates the passed array in place (shared state).
    function drawPiece(bag) {
        if (!bag || bag.length === 0) {
            bag.length = 0;
            bag.push.apply(bag, makeBag());
        }
        return createPiece(bag.pop());
    }

    // Horizontal spawn column for a shape (centered)
    function spawnColumn(shapeWidth, boardWidth) {
        return Math.floor((boardWidth - shapeWidth) / 2);
    }

    // Rotate a shape 90 degrees clockwise (pure, returns a new array)
    function rotateShape(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                rotated[c][rows - 1 - r] = shape[r][c];
            }
        }
        return rotated;
    }

    // Check a placement is inside the board and not colliding
    function isValidMove(board, row, col, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const br = row + r;
                const bc = col + c;
                if (br < 0 || br >= BOARD_HEIGHT || bc < 0 || bc >= BOARD_WIDTH) {
                    return false;
                }
                if (board[br][bc]) {
                    return false;
                }
            }
        }
        return true;
    }

    // Remove completed rows. Pure: returns { board, cleared }.
    function clearLines(board) {
        const remaining = board.filter(row => row.some(cell => cell === null));
        const cleared = board.length - remaining.length;
        while (remaining.length < BOARD_HEIGHT) {
            remaining.unshift(Array(BOARD_WIDTH).fill(null));
        }
        return { board: remaining, cleared };
    }

    const TetrisCore = {
        BOARD_WIDTH: BOARD_WIDTH,
        BOARD_HEIGHT: BOARD_HEIGHT,
        TETROMINOES: TETROMINOES,
        makeBag: makeBag,
        drawPiece: drawPiece,
        createPiece: createPiece,
        spawnColumn: spawnColumn,
        rotateShape: rotateShape,
        isValidMove: isValidMove,
        clearLines: clearLines
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TetrisCore;
    }
    global.TetrisCore = TetrisCore;
})(typeof window !== 'undefined' ? window : globalThis);