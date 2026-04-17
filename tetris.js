document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const levelElement = document.getElementById('level');
    const startButton = document.getElementById('start-button');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');
    const nextPieceDisplay = document.getElementById('next-piece');

    // Touch controls
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const rotateButton = document.getElementById('rotate-button');
    const downButton = document.getElementById('down-button');

    // Mobile touch gesture tracking
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // Game constants
    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const INITIAL_SPEED = 1000; // milliseconds
    const SPEED_INCREASE = 0.8; // multiplier for each level
    const LINES_PER_LEVEL = 10;

    // Game variables
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameInterval = null;
    let isPaused = false;
    let isGameOver = false;
    let ghostPiece = null;

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

    // Initialize the game
    function init() {
        // Make sure game over screen is hidden at start
        gameOverElement.classList.add('hidden');
        
        createBoard();
        createNextPieceDisplay();
        generateNewPiece();
        updateNextPieceDisplay();
        updateGhostPiece();
        drawBoard();
        updateGameSpeed();
        startButton.textContent = 'Pause';
    
        // Event listeners
        document.addEventListener('keydown', handleKeyPress);
        startButton.addEventListener('click', togglePause);
        restartButton.addEventListener('click', restartGame);

        // Touch controls event listeners
        const buttonBindings = [
            [leftButton, moveLeft],
            [rightButton, moveRight],
            [rotateButton, rotatePiece],
            [downButton, moveDown]
        ];

        buttonBindings.forEach(([button, action]) => {
            button.addEventListener('click', action);
            button.addEventListener('touchstart', event => {
                event.preventDefault();
                action();
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

    // Create the next piece display grid
    function createNextPieceDisplay() {
        nextPieceDisplay.innerHTML = '';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                nextPieceDisplay.appendChild(cell);
            }
        }
    }

    // Generate a new random tetromino
    function generateNewPiece() {
        const tetrominoTypes = Object.keys(TETROMINOES);
        const randomType = tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
        
        if (!nextPiece) {
            // First piece
            currentPiece = {
                type: randomType,
                shape: TETROMINOES[randomType].shape,
                color: TETROMINOES[randomType].color,
                row: 0,
                col: Math.floor((BOARD_WIDTH - TETROMINOES[randomType].shape[0].length) / 2)
            };
            
            // Generate the next piece
            const nextRandomType = tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
            nextPiece = {
                type: nextRandomType,
                shape: TETROMINOES[nextRandomType].shape,
                color: TETROMINOES[nextRandomType].color
            };
        } else {
            // Use the next piece as the current piece
            currentPiece = {
                type: nextPiece.type,
                shape: nextPiece.shape,
                color: nextPiece.color,
                row: 0,
                col: Math.floor((BOARD_WIDTH - nextPiece.shape[0].length) / 2)
            };
            
            // Generate a new next piece
            const nextRandomType = tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
            nextPiece = {
                type: nextRandomType,
                shape: TETROMINOES[nextRandomType].shape,
                color: TETROMINOES[nextRandomType].color
            };
        }
        
        // Check if the new piece can be placed
        if (!isValidMove(currentPiece.row, currentPiece.col, currentPiece.shape)) {
            gameOver();
        }
    }

    // Update the next piece display
    function updateNextPieceDisplay() {
        // Clear the display
        const cells = nextPieceDisplay.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.className = 'cell';
        });

        // Draw the next piece
        if (nextPiece) {
            const shape = nextPiece.shape;
            const color = nextPiece.color;
            
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
        let dropDistance = 0;
        while (isValidMove(ghostPiece.row + 1, ghostPiece.col, ghostPiece.shape)) {
            ghostPiece.row++;
            dropDistance++;
        }
        
        // If the ghost piece is too close to the current piece (less than 2 rows away),
        // don't show it to avoid the transparency effect
        if (dropDistance < 2) {
            ghostPiece = null;
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
            const shape = ghostPiece.shape;
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const boardRow = ghostPiece.row + row;
                        const boardCol = ghostPiece.col + col;
                        if (boardRow >= 0 && boardRow < BOARD_HEIGHT) {
                            const cellIndex = boardRow * BOARD_WIDTH + boardCol;
                            cells[cellIndex].classList.add('ghost');
                        }
                    }
                }
            }
        }

        // Draw the current piece
        if (currentPiece && !isGameOver) {
            const shape = currentPiece.shape;
            const color = currentPiece.color;
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const boardRow = currentPiece.row + row;
                        const boardCol = currentPiece.col + col;
                        if (boardRow >= 0 && boardRow < BOARD_HEIGHT) {
                            const cellIndex = boardRow * BOARD_WIDTH + boardCol;
                            cells[cellIndex].classList.add('tetromino', color);
                        }
                    }
                }
            }
        }
    }

    // Check if a move is valid
    function isValidMove(row, col, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;

                    // Check boundaries
                    if (newRow < 0 || newRow >= BOARD_HEIGHT || newCol < 0 || newCol >= BOARD_WIDTH) {
                        return false;
                    }

                    // Check collision with fixed pieces
                    if (newRow >= 0 && board[newRow][newCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // Rotate the current piece
    function rotatePiece() {
        if (isPaused || isGameOver || !currentPiece) return;

        const originalShape = currentPiece.shape;
        const rows = originalShape.length;
        const cols = originalShape[0].length;
        
        // Create a new rotated shape
        let newShape = Array.from({ length: cols }, () => 
            Array.from({ length: rows }, () => 0)
        );
        
        // Perform the rotation
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newShape[c][rows - 1 - r] = originalShape[r][c];
            }
        }
        
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
        
        // Add a small delay before locking the piece
        setTimeout(() => {
            lockPiece();
            updateScore();
        }, 100); // 100ms delay
    }

    // Lock the current piece in place
    function lockPiece() {
        const shape = currentPiece.shape;
        const color = currentPiece.color;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardRow = currentPiece.row + row;
                    const boardCol = currentPiece.col + col;
                    
                    if (boardRow >= 0) {
                        board[boardRow][boardCol] = color;
                    }
                }
            }
        }
        
        // Check for completed lines
        checkLines();
        
        // Generate a new piece
        generateNewPiece();
        updateNextPieceDisplay();
        updateGhostPiece();
        
        // Update the score (points for placing a piece)
        score += 10;
        updateScore();
    }

    // Check for completed lines
    function checkLines() {
        let linesCleared = 0;
        
        for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
            if (board[row].every(cell => cell !== null)) {
                // Remove the completed line
                board.splice(row, 1);
                // Add a new empty line at the top
                board.unshift(Array(BOARD_WIDTH).fill(null));
                linesCleared++;
                // Check the same row again (since we moved rows down)
                row++;
            }
        }
        
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
    }

    // Update the game speed based on level
    function updateGameSpeed() {
        if (gameInterval) {
            clearInterval(gameInterval);
        }
        
        const speed = INITIAL_SPEED * Math.pow(SPEED_INCREASE, level - 1);
        gameInterval = setInterval(() => {
            if (!isPaused && !isGameOver) {
                moveDown();
            }
        }, speed);
    }

    // Handle keyboard input
    function handleKeyPress(event) {
        if (isGameOver || isPaused) return;
        
        switch (event.key) {
            case 'ArrowLeft':
                moveLeft();
                break;
            case 'ArrowRight':
                moveRight();
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
            case 'p':
            case 'P':
                togglePause();
                break;
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
        const swipeThreshold = 40;
        const tapThreshold = 150;

        if (absX < swipeThreshold && absY < swipeThreshold && deltaTime < tapThreshold) {
            rotatePiece();
            return;
        }

        if (absX > absY) {
            if (deltaX > swipeThreshold) {
                moveRight();
            } else if (deltaX < -swipeThreshold) {
                moveLeft();
            }
        } else {
            if (deltaY > swipeThreshold) {
                if (moveDown()) {
                    score += 1;
                    updateScore();
                }
            } else if (deltaY < -swipeThreshold) {
                rotatePiece();
            }
        }
    }

    // Toggle pause state
    function togglePause() {
        if (isGameOver) return;

        isPaused = !isPaused;

        if (isPaused) {
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

    // Game over
    // Game over
    function gameOver() {
        isGameOver = true;
        clearInterval(gameInterval);
        finalScoreElement.textContent = score;
        gameOverElement.classList.remove('hidden');
        gameOverElement.style.removeProperty('display'); // Remove the inline style
    }

    // Restart the game
    function restartGame() {
        // Reset game variables
        board = [];
        currentPiece = null;
        nextPiece = null;
        score = 0;
        lines = 0;
        level = 1;
        isPaused = false;
        isGameOver = false;
        
        // Clear intervals
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        
        // Hide game over screen
        gameOverElement.classList.add('hidden');
        gameOverElement.style.display = 'none'; // Ensure inline style is also set
        
        // Reset button text
        startButton.textContent = 'Pause';
        
        // Reinitialize the game
        createBoard();
        generateNewPiece();
        updateNextPieceDisplay();
        updateGhostPiece();
        updateScore();
        updateGameSpeed();
        drawBoard();
    }

    // Start the game
    init();
});