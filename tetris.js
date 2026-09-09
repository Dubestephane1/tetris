document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const highScoreElement = document.getElementById('high-score');
    const startButton = document.getElementById('start-button');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const finalHighScoreElement = document.getElementById('final-high-score');
    const newHighScoreElement = document.getElementById('new-high-score');
    const restartButton = document.getElementById('restart-button');
    const nextPieceDisplay = document.getElementById('next-piece');
    const nextPieceDisplay2 = document.getElementById('next-piece-2');
    const nextPieceDisplay3 = document.getElementById('next-piece-3');
    const holdPieceDisplay = document.getElementById('hold-piece');

    // Touch controls
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const rotateButton = document.getElementById('rotate-button');
    const downButton = document.getElementById('down-button');
    const holdButton = document.getElementById('hold-button');

    // Mobile touch gesture tracking
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // Game constants
    const BOARD_WIDTH = TetrisCore.BOARD_WIDTH;
    const BOARD_HEIGHT = TetrisCore.BOARD_HEIGHT;
    const INITIAL_SPEED = 1000; // milliseconds
    const MIN_SPEED = 100; // never let the interval get absurdly fast
    const SPEED_INCREASE = 0.8; // multiplier for each level
    const LINES_PER_LEVEL = 10;
    const SWIPE_THRESHOLD = 40;
    const TAP_THRESHOLD = 150;
    const HIGH_SCORE_KEY = 'bella-tetris-high-score';
    const DAS_DELAY = 170; // ms before auto-repeat kicks in (Delayed Auto Shift)
    const ARR_DELAY = 50; // ms between auto-repeat moves (Auto Repeat Rate)

    // Game variables
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let nextQueue = [];
    let bag = [];
    let holdPiece = null;
    let canHold = true;
    let score = 0;
    let lines = 0;
    let level = 1;
    let highScore = 0;
    let gameStartHighScore = 0;
    let gameInterval = null;
    let isPaused = false;
    let isGameOver = false;
    let ghostPiece = null;
    let dasDirection = null; // 'left' | 'right' | null
    let dasTimer = null;
    let arrTimer = null;

    // Load saved high score
    try {
        highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0;
    } catch (e) {
        highScore = 0;
    }
    gameStartHighScore = highScore;

    // Helper to iterate over each solid cell of a piece
    function forEachPieceCell(piece, callback) {
        const shape = piece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    callback(piece.row + r, piece.col + c);
                }
            }
        }
    }

    // Initialize the game
    function init() {
        // Make sure game over screen is hidden at start
        gameOverElement.classList.add('hidden');

        createBoard();
        createPiecePreview(holdPieceDisplay);
        createPiecePreview(nextPieceDisplay);
        createPiecePreview(nextPieceDisplay2);
        createPiecePreview(nextPieceDisplay3);
        bag = TetrisCore.makeBag();
        generateNewPiece();
        updateNextPieceDisplay();
        updateHoldPieceDisplay();
        updateGhostPiece();
        drawBoard();
        updateGameSpeed();
        updateScore();
        startButton.textContent = 'Pause';

        // Event listeners
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('keyup', handleKeyUp);
        startButton.addEventListener('click', togglePause);
        restartButton.addEventListener('click', restartGame);

        // Touch controls event listeners (pointerdown = one event per press,
        // avoids the double-fire of click + touchstart on mobile browsers)
        const buttonBindings = [
            [leftButton, moveLeft],
            [rightButton, moveRight],
            [rotateButton, rotatePiece],
            [downButton, moveDown],
            [holdButton, toggleHold]
        ];

        let lastPointerAt = 0;
        buttonBindings.forEach(([button, action]) => {
            // pointerdown covers mouse + touch + pen (fires once per press,
            // avoiding the double-fire of click + touchstart on mobile)
            button.addEventListener('pointerdown', event => {
                event.preventDefault();
                lastPointerAt = Date.now();
                action();
            });
            // click covers keyboard activation (Enter/Space on a focused button,
            // which does not fire pointerdown). Guard suppresses the synthetic
            // click that follows a pointer press.
            button.addEventListener('click', () => {
                if (Date.now() - lastPointerAt > 500) {
                    action();
                }
            });
        });

        // Game board swipe controls for mobile
        gameBoard.addEventListener('touchstart', handleTouchStart, { passive: true });
        gameBoard.addEventListener('touchend', handleTouchEnd);
    }

    // Create the game board
    function createBoard() {
        gameBoard.innerHTML = '';

        // Initialize the board array
        board = Array.from({ length: BOARD_HEIGHT }, () =>
            Array.from({ length: BOARD_WIDTH }, () => null)
        );

        // Create the cells
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                gameBoard.appendChild(cell);
            }
        }
    }

    // Create a 4x4 preview grid inside a container
    function createPiecePreview(container) {
        container.innerHTML = '';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                container.appendChild(cell);
            }
        }
    }

    // Generate a new random tetromino (7-bag guarantee)
    function generateNewPiece() {
        if (!nextPiece) {
            nextPiece = TetrisCore.drawPiece(bag);
        }

        currentPiece = {
            ...nextPiece,
            row: 0,
            col: TetrisCore.spawnColumn(nextPiece.shape[0].length, BOARD_WIDTH)
        };

        // Pull the next piece from the queue, refilling the queue to 3 previews
        nextPiece = nextQueue.length ? nextQueue.shift() : TetrisCore.drawPiece(bag);
        while (nextQueue.length < 2) {
            nextQueue.push(TetrisCore.drawPiece(bag));
        }

        canHold = true;

        // Check if the new piece can be placed
        if (!isValidMove(currentPiece.row, currentPiece.col, currentPiece.shape)) {
            gameOver();
            return;
        }
    }

    // Hold or swap the current piece
    function toggleHold() {
        if (isPaused || isGameOver || !currentPiece || !canHold) return;

        const currentType = currentPiece.type;
        if (holdPiece) {
            // Swap current piece with the held one
            currentPiece = {
                ...holdPiece,
                row: 0,
                col: TetrisCore.spawnColumn(holdPiece.shape[0].length, BOARD_WIDTH)
            };
            holdPiece = TetrisCore.createPiece(currentType);
        } else {
            // Store current piece, bring the next one in
            holdPiece = TetrisCore.createPiece(currentType);
            currentPiece = {
                ...nextPiece,
                row: 0,
                col: TetrisCore.spawnColumn(nextPiece.shape[0].length, BOARD_WIDTH)
            };
            nextPiece = nextQueue.length ? nextQueue.shift() : TetrisCore.drawPiece(bag);
            while (nextQueue.length < 2) {
                nextQueue.push(TetrisCore.drawPiece(bag));
            }
        }

        canHold = false;

        updateNextPieceDisplay();
        updateHoldPieceDisplay();

        if (!isValidMove(currentPiece.row, currentPiece.col, currentPiece.shape)) {
            gameOver();
            return;
        }

        updateGhostPiece();
        drawBoard();
    }

    // Update the next piece display (3 previews)
    function updateNextPieceDisplay() {
        drawPiecePreview(nextPieceDisplay, nextPiece);
        drawPiecePreview(nextPieceDisplay2, nextQueue[0]);
        drawPiecePreview(nextPieceDisplay3, nextQueue[1]);
    }

    // Update the hold piece display
    function updateHoldPieceDisplay() {
        drawPiecePreview(holdPieceDisplay, holdPiece);
    }

    // Draw a single piece into a 4x4 preview container
    function drawPiecePreview(container, piece) {
        const cells = container.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });

        if (!piece) return;

        const shape = piece.shape;
        const color = piece.color;

        // Center the piece in the display
        const offsetRow = Math.floor((4 - shape.length) / 2);
        const offsetCol = Math.floor((4 - shape[0].length) / 2);

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const displayRow = row + offsetRow;
                    const displayCol = col + offsetCol;
                    const cellIndex = displayRow * 4 + displayCol;
                    cells[cellIndex].classList.add('tetromino', color);
                }
            }
        }
    }

    // Update the ghost piece (shadow of where the piece will land)
    function updateGhostPiece() {
        if (!currentPiece || isPaused || isGameOver) return;

        // Create a copy of the current piece
        ghostPiece = {
            ...currentPiece,
            row: currentPiece.row
        };

        // Drop the ghost piece as far as it can go
        while (isValidMove(ghostPiece.row + 1, ghostPiece.col, ghostPiece.shape)) {
            ghostPiece.row++;
        }
    }

    // Draw the game board
    function drawBoard() {
        // Clear the visual board
        const cells = gameBoard.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });

        // Draw the fixed pieces on the board
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                if (board[row][col]) {
                    const cellIndex = row * BOARD_WIDTH + col;
                    cells[cellIndex].classList.add('tetromino', board[row][col]);
                }
            }
        }

        // Draw the ghost piece
        if (ghostPiece && !isPaused && !isGameOver) {
            forEachPieceCell(ghostPiece, (row, col) => {
                if (row >= 0 && row < BOARD_HEIGHT) {
                    const cellIndex = row * BOARD_WIDTH + col;
                    cells[cellIndex].classList.add('ghost');
                }
            });
        }

        // Draw the current piece
        if (currentPiece && !isGameOver) {
            forEachPieceCell(currentPiece, (row, col) => {
                if (row >= 0 && row < BOARD_HEIGHT) {
                    const cellIndex = row * BOARD_WIDTH + col;
                    cells[cellIndex].classList.add('tetromino', currentPiece.color);
                }
            });
        }
    }

    // Check if a move is valid
    function isValidMove(row, col, shape) {
        return TetrisCore.isValidMove(board, row, col, shape);
    }

    // Rotate the current piece
    function rotatePiece() {
        if (isPaused || isGameOver || !currentPiece) return;

        const originalShape = currentPiece.shape;
        const newShape = TetrisCore.rotateShape(originalShape);

        // Check if the rotation is valid
        if (isValidMove(currentPiece.row, currentPiece.col, newShape)) {
            currentPiece.shape = newShape;
            updateGhostPiece();
            drawBoard();
        } else {
            // Try wall kicks (adjusting position to make rotation possible)
            const kicks = [
                { row: 0, col: 1 },  // Try right
                { row: 0, col: -1 }, // Try left
                { row: -1, col: 0 }, // Try up
                { row: 1, col: 0 },  // Try down
                { row: -1, col: 1 }, // Try up-right
                { row: -1, col: -1 }, // Try up-left
                { row: 1, col: 1 },  // Try down-right
                { row: 1, col: -1 }  // Try down-left
            ];

            for (const kick of kicks) {
                if (isValidMove(currentPiece.row + kick.row, currentPiece.col + kick.col, newShape)) {
                    currentPiece.row += kick.row;
                    currentPiece.col += kick.col;
                    currentPiece.shape = newShape;
                    updateGhostPiece();
                    drawBoard();
                    break;
                }
            }
        }
    }

    // Move the current piece left
    function moveLeft() {
        if (isPaused || isGameOver || !currentPiece) return;

        if (isValidMove(currentPiece.row, currentPiece.col - 1, currentPiece.shape)) {
            currentPiece.col--;
            updateGhostPiece();
            drawBoard();
        }
    }

    // Move the current piece right
    function moveRight() {
        if (isPaused || isGameOver || !currentPiece) return;

        if (isValidMove(currentPiece.row, currentPiece.col + 1, currentPiece.shape)) {
            currentPiece.col++;
            updateGhostPiece();
            drawBoard();
        }
    }

    // Move the current piece down
    function moveDown() {
        if (isPaused || isGameOver || !currentPiece) return;

        if (isValidMove(currentPiece.row + 1, currentPiece.col, currentPiece.shape)) {
            currentPiece.row++;
            updateGhostPiece();
            drawBoard();
            return true;
        } else {
            lockPiece();
            return false;
        }
    }

    // Drop the current piece all the way down
    function hardDrop() {
        if (isPaused || isGameOver || !currentPiece) return;

        while (isValidMove(currentPiece.row + 1, currentPiece.col, currentPiece.shape)) {
            currentPiece.row++;
            // Add points for hard drop
            score += 2;
        }

        // Draw the board to show the piece at the bottom before locking
        updateGhostPiece();
        drawBoard();

        // Lock the piece immediately to avoid race conditions
        lockPiece();
        updateScore();
    }

    // Lock the current piece in place
    function lockPiece() {
        forEachPieceCell(currentPiece, (row, col) => {
            if (row >= 0) {
                board[row][col] = currentPiece.color;
            }
        });

        // Check for completed lines
        checkLines();

        // Generate a new piece
        generateNewPiece();
        updateNextPieceDisplay();
        updateGhostPiece();

        // Update the score (points for placing a piece)
        score += 10;
        updateScore();

        // Repaint immediately so the newly locked piece is visible without lag
        drawBoard();
    }

    // Check for completed lines
    function checkLines() {
        const result = TetrisCore.clearLines(board);
        const linesCleared = result.cleared;
        board = result.board;

        if (linesCleared > 0) {
            // Update lines and score
            lines += linesCleared;

            // Calculate score based on number of lines cleared at once
            // Using the original Nintendo scoring system
            const linePoints = {
                1: 40,
                2: 100,
                3: 300,
                4: 1200
            };

            score += linePoints[linesCleared] * level;

            // Check for level up
            level = Math.floor(lines / LINES_PER_LEVEL) + 1;

            // Update game speed
            updateGameSpeed();

            // Update display
            updateScore();
        }
    }

    // Update the score display
    function updateScore() {
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;

        // Track high score (persisted on game over)
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
        }
    }

    // Update the game speed based on level
    function updateGameSpeed() {
        if (gameInterval) {
            clearInterval(gameInterval);
        }

        const speed = Math.max(
            MIN_SPEED,
            INITIAL_SPEED * Math.pow(SPEED_INCREASE, level - 1)
        );
        gameInterval = setInterval(() => {
            if (!isPaused && !isGameOver) {
                moveDown();
            }
        }, speed);
    }

    // Stop DAS auto-repeat (key release / pause / game over)
    function stopDAS() {
        if (dasTimer) {
            clearTimeout(dasTimer);
            dasTimer = null;
        }
        if (arrTimer) {
            clearInterval(arrTimer);
            arrTimer = null;
        }
        dasDirection = null;
    }

    // Start DAS: immediate move, then auto-repeat after DAS_DELAY at ARR_DELAY
    function startDAS(direction, moveFn) {
        if (dasDirection === direction) return; // already auto-repeating this way
        stopDAS();
        dasDirection = direction;

        moveFn();
        dasTimer = setTimeout(() => {
            dasTimer = null;
            if (dasDirection !== direction) return;
            arrTimer = setInterval(() => {
                if (dasDirection !== direction) {
                    stopDAS();
                    return;
                }
                moveFn();
            }, ARR_DELAY);
        }, DAS_DELAY);
    }

    // Handle keyboard input
    function handleKeyPress(event) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'c', 'C'];
        if (gameKeys.includes(event.key)) {
            event.preventDefault(); // stop the page from scrolling
        }

        // Pause/unpause must work even while paused (needed to resume with P)
        if (event.key === 'p' || event.key === 'P') {
            togglePause();
            return;
        }

        if (isGameOver || isPaused) return;

        switch (event.key) {
            case 'ArrowLeft':
                startDAS('left', moveLeft);
                break;
            case 'ArrowRight':
                startDAS('right', moveRight);
                break;
            case 'ArrowDown':
                if (moveDown()) {
                    // Add points for soft drop
                    score += 1;
                    updateScore();
                }
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ': // Space
                hardDrop();
                break;
            case 'c':
            case 'C':
                toggleHold();
                break;
        }
    }

    // Stop DAS on key release
    function handleKeyUp(event) {
        if (event.key === 'ArrowLeft' && dasDirection === 'left') {
            stopDAS();
        } else if (event.key === 'ArrowRight' && dasDirection === 'right') {
            stopDAS();
        }
    }

    function handleTouchStart(event) {
        if (isGameOver || isPaused || !currentPiece) return;
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
    }

    function handleTouchEnd(event) {
        if (isGameOver || isPaused || !currentPiece) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD && deltaTime < TAP_THRESHOLD) {
            rotatePiece();
            return;
        }

        if (absX > absY) {
            if (deltaX > SWIPE_THRESHOLD) {
                moveRight();
            } else if (deltaX < -SWIPE_THRESHOLD) {
                moveLeft();
            }
        } else {
            if (deltaY > SWIPE_THRESHOLD) {
                if (moveDown()) {
                    score += 1;
                    updateScore();
                }
            } else if (deltaY < -SWIPE_THRESHOLD) {
                rotatePiece();
            }
        }
    }

    // Toggle pause state
    function togglePause() {
        if (isGameOver) return;

        isPaused = !isPaused;

        if (isPaused) {
            stopDAS();
            startButton.textContent = 'Resume';
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
        } else {
            startButton.textContent = 'Pause';
            updateGameSpeed();
        }
    }

    // Save the high score and show the game over screen
    function endGame() {
        isGameOver = true;
        stopDAS();
        clearInterval(gameInterval);
        gameInterval = null;

        // Persist high score
        try {
            localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
        } catch (e) {
            // localStorage unavailable (e.g. private mode) — ignore
        }

        finalScoreElement.textContent = score;
        finalHighScoreElement.textContent = highScore;
        if (score > gameStartHighScore && score > 0) {
            newHighScoreElement.classList.remove('hidden');
        } else {
            newHighScoreElement.classList.add('hidden');
        }

        drawBoard(); // show the final locked state
        gameOverElement.classList.remove('hidden');
    }

    // Game over
    function gameOver() {
        endGame();
    }

    // Restart the game
    function restartGame() {
        // Reset game variables
        board = [];
        currentPiece = null;
        nextPiece = null;
        nextQueue = [];
        bag = TetrisCore.makeBag();
        holdPiece = null;
        canHold = true;
        score = 0;
        lines = 0;
        level = 1;
        isPaused = false;
        isGameOver = false;
        stopDAS();
        gameStartHighScore = highScore;

        // Clear intervals
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        // Hide game over screen
        gameOverElement.classList.add('hidden');
        newHighScoreElement.classList.add('hidden');

        // Reset button text
        startButton.textContent = 'Pause';

        // Reinitialize the game
        createBoard();
        generateNewPiece();
        updateNextPieceDisplay();
        updateHoldPieceDisplay();
        updateGhostPiece();
        updateScore();
        updateGameSpeed();
        drawBoard();
    }

    // Start the game
    init();
});