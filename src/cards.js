// King Card Game - Card engine and texture atlas
import * as THREE from 'three';

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs']; // Maça, Kupa, Karo, Sinek
export const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};
export const SUIT_NAMES_TR = {
  spades: 'Maça',
  hearts: 'Kupa',
  diamonds: 'Karo',
  clubs: 'Sinek',
};
export const SUIT_COLORS = {
  spades: '#1a1a24',
  hearts: '#d62828',
  diamonds: '#d62828',
  clubs: '#1a1a24',
};

export const RANKS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'
];
export const RANK_NAMES_TR = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
  '9': '9', '10': '10', 'J': 'Vale', 'Q': 'Kız', 'K': 'Papaz', 'A': 'As'
};

// Rank value for trick comparison (2 = 2, ..., 10 = 10, J = 11, Q = 12, K = 13, A = 14)
export function getRankValue(rank) {
  return RANKS.indexOf(rank) + 2;
}

export function createDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: id++,
        suit,
        rank,
        value: getRankValue(rank),
        name: `${RANK_NAMES_TR[rank]} of ${SUIT_NAMES_TR[suit]}`,
        symbol: SUIT_SYMBOLS[suit],
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Sort cards by suit, then rank
export function sortHand(cards) {
  const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
  return [...cards].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

// Generate Card Texture Atlas (53 tiles: 52 cards + 1 back)
// Grid: 8 columns x 7 rows = 56 slots. Each card tile is 128x180 px.
export function createCardAtlas() {
  const tileW = 128;
  const tileH = 180;
  const cols = 8;
  const rows = 7;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileW;
  canvas.height = rows * tileH;
  const ctx = canvas.getContext('2d');

  // Background clear
  ctx.fillStyle = '#0a361f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let idx = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * tileW;
      const y = row * tileH;

      drawSingleCard(ctx, x, y, tileW, tileH, suit, rank);
      idx++;
    }
  }

  // Slot 52: Card Back
  const backCol = 52 % cols;
  const backRow = Math.floor(52 / cols);
  drawCardBack(ctx, backCol * tileW, backRow * tileH, tileW, tileH);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { texture, cols, rows, tileW, tileH };
}

function drawSingleCard(ctx, x, y, w, h, suit, rank) {
  const pad = 4;
  const radius = 8;

  // Card base
  ctx.save();
  ctx.translate(x + pad, y + pad);
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  // Shadow / border
  ctx.fillStyle = '#111';
  roundRect(ctx, 0, 0, cw, ch, radius);
  ctx.fill();

  // White face
  ctx.fillStyle = '#f8f9fa';
  roundRect(ctx, 1.5, 1.5, cw - 3, ch - 3, radius - 1);
  ctx.fill();

  // Card border outline
  ctx.strokeStyle = '#d0d5dd';
  ctx.lineWidth = 1;
  ctx.stroke();

  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];

  // Top-left Rank & Symbol
  ctx.fillStyle = color;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, 8, 8);

  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(symbol, 8, 30);

  // Bottom-right Rank & Symbol (inverted)
  ctx.save();
  ctx.translate(cw - 8, ch - 8);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, 0, 0);

  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(symbol, 0, 22);
  ctx.restore();

  // Center large symbol or face representation
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (['J', 'Q', 'K'].includes(rank)) {
    // Face card decorative box
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cw / 2 - 22, ch / 2 - 28, 44, 56);

    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(rank, cw / 2, ch / 2 - 2);

    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(symbol, cw / 2, ch / 2 + 38);
  } else {
    ctx.font = '48px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(symbol, cw / 2, ch / 2);
  }

  // Subtle inner decorative frame
  ctx.strokeStyle = '#e9ecef';
  ctx.lineWidth = 0.8;
  roundRect(ctx, 6, 6, cw - 12, ch - 12, radius - 2);
  ctx.stroke();

  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  const pad = 4;
  const radius = 8;
  ctx.save();
  ctx.translate(x + pad, y + pad);
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  // Outer border
  ctx.fillStyle = '#111';
  roundRect(ctx, 0, 0, cw, ch, radius);
  ctx.fill();

  // White rim
  ctx.fillStyle = '#fff';
  roundRect(ctx, 2, 2, cw - 4, ch - 4, radius - 1);
  ctx.fill();

  // Deep red/blue patterned back
  ctx.fillStyle = '#9b111e'; // Royal Ruby Red
  roundRect(ctx, 5, 5, cw - 10, ch - 10, radius - 2);
  ctx.fill();

  // Pattern
  ctx.strokeStyle = '#d4af37'; // Gold diamond pattern
  ctx.lineWidth = 1;
  const step = 14;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 6, 6, cw - 12, ch - 12, radius - 3);
  ctx.clip();

  for (let px = -ch; px < cw + ch; px += step) {
    ctx.moveTo(px, 0);
    ctx.lineTo(px + ch, ch);
    ctx.moveTo(px + ch, 0);
    ctx.lineTo(px, ch);
  }
  ctx.stroke();

  // Center crest
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cw / 2, ch / 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#9b111e';
  ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👑', cw / 2, ch / 2);

  ctx.restore();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Compute UV coordinates for a card ID (0..51) or 52 for back
export function getCardUVs(cardId, cols = 8, rows = 7) {
  const col = cardId % cols;
  const row = Math.floor(cardId / cols);
  const uMin = col / cols;
  const uMax = (col + 1) / cols;
  const vMax = 1 - row / rows;
  const vMin = 1 - (row + 1) / rows;
  return { uMin, uMax, vMin, vMax };
}
