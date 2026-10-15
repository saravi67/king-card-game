// King Card Game - Game rules, contract definitions and scoring

export const CONTRACT_TYPES = {
  // Penalties
  EL_ALMAZ: { id: 'EL_ALMAZ', type: 'penalty', name: 'El Almaz', desc: 'Her el -50 puan', maxTotal: -650 },
  KUPA_ALMAZ: { id: 'KUPA_ALMAZ', type: 'penalty', name: 'Kupa Almaz', desc: 'Her Kupa -30 puan', maxTotal: -390 },
  ERKEK_ALMAZ: { id: 'ERKEK_ALMAZ', type: 'penalty', name: 'Erkek Almaz', desc: 'Her Vale/Papaz -60 puan', maxTotal: -480 },
  KIZ_ALMAZ: { id: 'KIZ_ALMAZ', type: 'penalty', name: 'Kız Almaz', desc: 'Her Kız -100 puan', maxTotal: -400 },
  RIFKI: { id: 'RIFKI', type: 'penalty', name: 'Rıfkı', desc: 'Kupa Papazı -320 puan', maxTotal: -320 },
  SON_IKI: { id: 'SON_IKI', type: 'penalty', name: 'Son İki', desc: '12 ve 13. el -180 puan', maxTotal: -360 },

  // Trump (Koz) contracts
  KOZ_SPADES: { id: 'KOZ_SPADES', type: 'trump', trumpSuit: 'spades', name: 'Koz Maça ♠', desc: 'El başı +50 puan', maxTotal: 650 },
  KOZ_HEARTS: { id: 'KOZ_HEARTS', type: 'trump', trumpSuit: 'hearts', name: 'Koz Kupa ♥', desc: 'El başı +50 puan', maxTotal: 650 },
  KOZ_DIAMONDS: { id: 'KOZ_DIAMONDS', type: 'trump', trumpSuit: 'diamonds', name: 'Koz Karo ♦', desc: 'El başı +50 puan', maxTotal: 650 },
  KOZ_CLUBS: { id: 'KOZ_CLUBS', type: 'trump', trumpSuit: 'clubs', name: 'Koz Sinek ♣', desc: 'El başı +50 puan', maxTotal: 650 },
};

export const ALL_PENALTIES = [
  'EL_ALMAZ', 'KUPA_ALMAZ', 'ERKEK_ALMAZ', 'KIZ_ALMAZ', 'RIFKI', 'SON_IKI'
];

export const ALL_TRUMPS = [
  'KOZ_SPADES', 'KOZ_HEARTS', 'KOZ_DIAMONDS', 'KOZ_CLUBS'
];

// Determine which cards in a player's hand are legal to play
export function getPlayableCards(hand, currentTrick, contract, heartsBroken = false) {
  if (!hand || hand.length === 0) return [];

  // Lead player (first card in trick)
  if (currentTrick.length === 0) {
    // In Kupa Almaz or Rıfkı, cannot lead Hearts until Hearts have been broken,
    // UNLESS the player has only Hearts left in their hand.
    const isHeartsPenalty = contract.id === 'KUPA_ALMAZ' || contract.id === 'RIFKI';
    if (isHeartsPenalty && !heartsBroken) {
      const nonHearts = hand.filter(c => c.suit !== 'hearts');
      if (nonHearts.length > 0) {
        return nonHearts;
      }
    }
    return [...hand];
  }

  // Follow player (subsequent cards)
  const leadSuit = currentTrick[0].card.suit;
  const sameSuitCards = hand.filter(c => c.suit === leadSuit);

  // Must follow suit if able
  if (sameSuitCards.length > 0) {
    return sameSuitCards;
  }

  // If void in lead suit:
  if (contract.type === 'trump') {
    // In Trump game: if player has trump cards, they must play a trump (trump cut)
    const trumpCards = hand.filter(c => c.suit === contract.trumpSuit);
    if (trumpCards.length > 0) {
      // Overtrumping rule (Koz yükseltme kuralı):
      // If someone has already played a trump, must play a higher trump if holding one
      const trumpsInTrick = currentTrick.filter(t => t.card.suit === contract.trumpSuit);
      if (trumpsInTrick.length > 0) {
        const highestTrumpVal = Math.max(...trumpsInTrick.map(t => t.card.value));
        const higherTrumps = trumpCards.filter(c => c.value > highestTrumpVal);
        if (higherTrumps.length > 0) {
          return higherTrumps;
        }
      }
      return trumpCards;
    }
  }

  // Otherwise, can play any card from hand
  return [...hand];
}

// Determine who wins the trick
// trick: array of { playerId, card }
export function determineTrickWinner(trick, contract) {
  if (!trick || trick.length === 0) return null;

  const leadCard = trick[0].card;
  const isTrump = contract.type === 'trump';
  const trumpSuit = isTrump ? contract.trumpSuit : null;

  let bestEntry = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const entry = trick[i];
    const bestCard = bestEntry.card;
    const currentCard = entry.card;

    if (isTrump) {
      // If current card is trump and best wasn't trump -> current wins
      if (currentCard.suit === trumpSuit && bestCard.suit !== trumpSuit) {
        bestEntry = entry;
      }
      // If both are trump -> higher rank wins
      else if (currentCard.suit === trumpSuit && bestCard.suit === trumpSuit) {
        if (currentCard.value > bestCard.value) {
          bestEntry = entry;
        }
      }
      // If neither is trump -> must match lead suit and be higher rank
      else if (bestCard.suit !== trumpSuit && currentCard.suit === leadCard.suit) {
        if (currentCard.value > bestCard.value) {
          bestEntry = entry;
        }
      }
    } else {
      // Penalty game: No trump. Must match lead suit and be higher rank
      if (currentCard.suit === leadCard.suit && currentCard.value > bestCard.value) {
        bestEntry = entry;
      }
    }
  }

  return bestEntry.playerId;
}

// Calculate scores for a completed trick
// trickIndex is 0 to 12 (trick 11 and 12 are the last two)
export function calculateTrickScores(trick, trickIndex, contract, winnerId) {
  const scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let points = 0;

  switch (contract.id) {
    case 'EL_ALMAZ':
      points = -50;
      break;

    case 'KUPA_ALMAZ':
      for (const item of trick) {
        if (item.card.suit === 'hearts') {
          points -= 30;
        }
      }
      break;

    case 'ERKEK_ALMAZ':
      for (const item of trick) {
        if (['J', 'K'].includes(item.card.rank)) {
          points -= 60;
        }
      }
      break;

    case 'KIZ_ALMAZ':
      for (const item of trick) {
        if (item.card.rank === 'Q') {
          points -= 100;
        }
      }
      break;

    case 'RIFKI':
      for (const item of trick) {
        if (item.card.suit === 'hearts' && item.card.rank === 'K') {
          points -= 320;
        }
      }
      break;

    case 'SON_IKI':
      if (trickIndex === 11 || trickIndex === 12) {
        points = -180;
      }
      break;

    default:
      if (contract.type === 'trump') {
        points = +50; // Each trick in trump gives +50
      }
      break;
  }

  scores[winnerId] = points;
  return { scores, pointsEarned: points };
}

// Check if any Hearts were played in this trick (breaks Hearts)
export function doesTrickBreakHearts(trick) {
  return trick.some(t => t.card.suit === 'hearts');
}
