// Bella Tetris — core logic unit tests (Node built-in test runner, no deps)
// Run: node --test tests/tetris-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const TetrisCore = require('../tetris-core.js');

test('exports the expected API', () => {
  assert.equal(typeof TetrisCore.makeBag, 'function');
  assert.equal(typeof TetrisCore.drawPiece, 'function');
  assert.equal(typeof TetrisCore.createPiece, 'function');
  assert.equal(typeof TetrisCore.rotateShape, 'function');
  assert.equal(typeof TetrisCore.isValidMove, 'function');
  assert.equal(typeof TetrisCore.clearLines, 'function');
  assert.equal(TetrisCore.BOARD_WIDTH, 10);
  assert.equal(TetrisCore.BOARD_HEIGHT, 20);
});

test('7-bag guarantees all 7 piece types exactly once per bag', () => {
  const bag = TetrisCore.makeBag();
  assert.equal(bag.length, 7);
  assert.equal(new Set(bag).size, 7);
  ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].forEach((t) => assert.ok(bag.includes(t)));
});

test('two bags are almost surely different but both complete', () => {
  const b1 = TetrisCore.makeBag();
  const b2 = TetrisCore.makeBag();
  assert.equal(new Set(b1).size, 7);
  assert.equal(new Set(b2).size, 7);
});

test('drawPiece refills the bag when empty and drains it completely', () => {
  const bag = [];
  const drawn = [];
  for (let i = 0; i < 14; i++) {
    drawn.push(TetrisCore.drawPiece(bag).type);
  }
  // 14 draws = two full bags; each type exactly twice
  const counts = {};
  drawn.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
  ['I', 'J', 'L', 'O', 'S', 'T', 'Z'].forEach((t) => assert.equal(counts[t], 2));
});

test('createPiece builds a valid piece object', () => {
  const piece = TetrisCore.createPiece('I');
  assert.equal(piece.type, 'I');
  assert.equal(piece.color, 'I');
  assert.ok(Array.isArray(piece.shape));
});

test('rotateShape rotates clockwise (I piece 4x4 horizontal -> vertical)', () => {
  const horizontal = [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  const rotated = TetrisCore.rotateShape(horizontal);
  // Rotated I occupies column 2 (rows 0..3) in the 4x4 box
  assert.deepEqual(rotated.map((row) => row[2]), [1, 1, 1, 1]);
  // All other cells are empty
  assert.equal(rotated.flat().filter(Boolean).length, 4);
});

test('rotateShape is pure (does not mutate input)', () => {
  const original = TetrisCore.createPiece('T').shape;
  const snapshot = JSON.stringify(original);
  TetrisCore.rotateShape(original);
  assert.equal(JSON.stringify(original), snapshot);
});

test('rotateShape twice + twice returns to original (4 rotations = identity)', () => {
  const T = TetrisCore.createPiece('T').shape;
  const r1 = TetrisCore.rotateShape(T);
  const r2 = TetrisCore.rotateShape(r1);
  const r3 = TetrisCore.rotateShape(r2);
  const r4 = TetrisCore.rotateShape(r3);
  assert.deepEqual(r4, T);
});

test('isValidMove: valid placement in empty board', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  const T = TetrisCore.createPiece('T').shape;
  assert.equal(TetrisCore.isValidMove(board, 0, 3, T), true);
});

test('isValidMove: rejects out-of-bounds (left wall)', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  const I = TetrisCore.createPiece('I').shape; // 4 wide
  assert.equal(TetrisCore.isValidMove(board, 0, -1, I), false);
});

test('isValidMove: rejects out-of-bounds (right wall)', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  const O = TetrisCore.createPiece('O').shape; // 2 wide
  assert.equal(TetrisCore.isValidMove(board, 0, 9, O), false);
});

test('isValidMove: rejects out-of-bounds (bottom)', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  const O = TetrisCore.createPiece('O').shape;
  assert.equal(TetrisCore.isValidMove(board, 19, 4, O), false);
});

test('isValidMove: rejects collision with filled cell', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  board[1][4] = 'J'; // occupied cell where T piece would land
  const T = TetrisCore.createPiece('T').shape;
  assert.equal(TetrisCore.isValidMove(board, 0, 3, T), false);
});

test('clearLines: returns same board when no full rows', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  board[19][0] = 'O'; // almost full but not complete
  const result = TetrisCore.clearLines(board);
  assert.equal(result.cleared, 0);
  assert.equal(result.board.length, 20);
  assert.equal(result.board[19][0], 'O');
});

test('clearLines: one full row is removed and empties appended at top', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  board[19] = Array(10).fill('I'); // complete row
  board[18][3] = 'T';              // keep a marker row
  const result = TetrisCore.clearLines(board);
  assert.equal(result.cleared, 1);
  assert.equal(result.board.length, 20);
  // marker row moved down one; the emptied top row is null
  assert.equal(result.board[19][3], 'T');
  assert.deepEqual(result.board[0], Array(10).fill(null));
});

test('clearLines: Tetris (4 rows) clears all 4 at once', () => {
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  for (let r = 16; r <= 19; r++) board[r] = Array(10).fill('I');
  const result = TetrisCore.clearLines(board);
  assert.equal(result.cleared, 4);
  assert.equal(result.board.length, 20);
  assert.deepEqual(result.board[0], Array(10).fill(null));
});

test('spawnColumn centers pieces', () => {
  assert.equal(TetrisCore.spawnColumn(4, 10), 3); // I piece -> col 3
  assert.equal(TetrisCore.spawnColumn(2, 10), 4); // O piece -> col 4
  assert.equal(TetrisCore.spawnColumn(3, 10), 3); // T/J/L/S/Z -> col 3
});