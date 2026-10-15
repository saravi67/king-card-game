// King Card Game - AI Decision Engine
import { CONTRACT_TYPES } from './kingRules.js';

export class KingAI {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  // Choose the best available contract given the bot's hand
  chooseContract(availableContracts, hand) {
    // Evaluate Trump potential
    const suits = { spades: [], hearts: [], diamonds: [], clubs: [] };
    for (const card of hand) {
      suits[card.suit].push(card);
    }

    let bestTrumpSuit = null;
    let maxTrumpScore = -1;

    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
      const contractId = `KOZ_${suit.toUpperCase()}`;
      if (availableContracts.includes(contractId)) {
        const count = suits[suit].length;
        const highCards = suits[suit].filter(c => c.value >= 12).length; // Q, K, A
        const acesInOther = Object.keys(suits)
          .filter(s => s !== suit)
          .reduce((sum, s) => sum + suits[s].filter(c => c.rank === 'A').length, 0);

        const score = count * 2.5 + highCards * 2 + acesInOther * 1.5;
        if (score > maxTrumpScore) {
          maxTrumpScore = score;
          bestTrumpSuit = contractId;
        }
      }
    }

    // Evaluate Penalty options
    const penalties = availableContracts.filter(c => CONTRACT_TYPES[c].type === 'penalty');

    // If trump score is very good (e.g. 5+ cards of suit and high cards) and trump available, pick trump!
    if (bestTrumpSuit && maxTrumpScore >= 16 && Math.random() < 0.75) {
      return CONTRACT_TYPES[bestTrumpSuit];
    }

    // If penalties are left, pick the safest penalty
    if (penalties.length > 0) {
      let bestPenalty = penalties[0];
      let minRisk = 999;

      for (const pId of penalties) {
        let risk = 0;
        switch (pId) {
          case 'RIFKI':
            // High risk if holding King of Hearts or Ace of Hearts with few other hearts
            const hasHeartK = hand.some(c => c.suit === 'hearts' && c.rank === 'K');
            const hasHeartA = hand.some(c => c.suit === 'hearts' && c.rank === 'A');
            const heartCount = suits.hearts.length;
            if (hasHeartK) risk += 100;
            if (hasHeartA && heartCount < 3) risk += 40;
            risk += heartCount * 2;
            break;

          case 'KIZ_ALMAZ':
            const queens = hand.filter(c => c.rank === 'Q');
            risk = queens.length * 25;
            for (const q of queens) {
              if (suits[q.suit].length <= 2) risk += 20; // unprotected Queen
            }
            break;

          case 'ERKEK_ALMAZ':
            const jacksAndKings = hand.filter(c => ['J', 'K'].includes(c.rank));
            risk = jacksAndKings.length * 15;
            break;

          case 'KUPA_ALMAZ':
            const highHearts = suits.hearts.filter(c => c.value >= 10);
            risk = suits.hearts.length * 5 + highHearts.length * 15;
            break;

          case 'SON_IKI':
            // Risk if holding very high cards that will be left for last tricks
            const aces = hand.filter(c => c.rank === 'A').length;
            const kings = hand.filter(c => c.rank === 'K').length;
            risk = (aces + kings) * 10;
            break;

          case 'EL_ALMAZ':
            const highTotal = hand.filter(c => c.value >= 12).length;
            risk = highTotal * 12;
            break;
        }

        if (risk < minRisk) {
          minRisk = risk;
          bestPenalty = pId;
        }
      }

      return CONTRACT_TYPES[bestPenalty];
    }

    // Fallback to best trump or first available
    return CONTRACT_TYPES[bestTrumpSuit || availableContracts[0]];
  }

  // Choose which card to play from legal playableCards
  chooseCard(playableCards, currentTrick, contract, trickIndex, playedCardsHistory = []) {
    if (playableCards.length === 1) {
      return playableCards[0];
    }

    const isTrump = contract.type === 'trump';

    // 1. LEAD CARD (First to play in trick)
    if (currentTrick.length === 0) {
      if (isTrump) {
        // In trump game:
        // Try leading an Ace of non-trump to cash a trick
        const nonTrumpAces = playableCards.filter(c => c.suit !== contract.trumpSuit && c.rank === 'A');
        if (nonTrumpAces.length > 0) return nonTrumpAces[0];

        // Or lead high trump to pull out opponents' trumps
        const trumps = playableCards.filter(c => c.suit === contract.trumpSuit);
        if (trumps.length >= 3) {
          trumps.sort((a, b) => b.value - a.value);
          return trumps[0];
        }

        // Otherwise lead a low card
        playableCards.sort((a, b) => a.value - b.value);
        return playableCards[0];
      } else {
        // In penalty game:
        // Never lead high cards! Lead lowest possible safe card.
        playableCards.sort((a, b) => a.value - b.value);
        return playableCards[0];
      }
    }

    // 2. FOLLOWING IN TRICK
    const leadSuit = currentTrick[0].card.suit;
    const canFollowSuit = playableCards.some(c => c.suit === leadSuit);

    // Current highest card on table that would win so far
    let winningCard = currentTrick[0].card;
    for (let i = 1; i < currentTrick.length; i++) {
      const c = currentTrick[i].card;
      if (isTrump) {
        if (c.suit === contract.trumpSuit && winningCard.suit !== contract.trumpSuit) {
          winningCard = c;
        } else if (c.suit === winningCard.suit && c.value > winningCard.value) {
          winningCard = c;
        }
      } else {
        if (c.suit === leadSuit && c.value > winningCard.value) {
          winningCard = c;
        }
      }
    }

    if (isTrump) {
      // In trump game:
      if (canFollowSuit) {
        // Can we win the trick with lowest winning card?
        const winners = playableCards.filter(c => c.value > winningCard.value);
        if (winners.length > 0 && (winningCard.suit !== contract.trumpSuit || leadSuit === contract.trumpSuit)) {
          winners.sort((a, b) => a.value - b.value);
          return winners[0]; // Smallest winning card
        }
        // Cannot win or already trumped: dump smallest
        playableCards.sort((a, b) => a.value - b.value);
        return playableCards[0];
      } else {
        // Cannot follow suit: Trumps available?
        const trumps = playableCards.filter(c => c.suit === contract.trumpSuit);
        if (trumps.length > 0) {
          // Play smallest trump that wins
          const winningTrumps = trumps.filter(c => winningCard.suit !== contract.trumpSuit || c.value > winningCard.value);
          if (winningTrumps.length > 0) {
            winningTrumps.sort((a, b) => a.value - b.value);
            return winningTrumps[0];
          }
        }
        // Dump lowest junk card
        playableCards.sort((a, b) => a.value - b.value);
        return playableCards[0];
      }
    } else {
      // In penalty game:
      if (canFollowSuit) {
        // Avoid winning! Try to play largest card UNDER the winning card.
        const under = playableCards.filter(c => c.value < winningCard.value);
        if (under.length > 0) {
          under.sort((a, b) => b.value - a.value); // highest card that still doesn't take trick
          return under[0];
        }
        // Forced to take trick: play smallest winning card or dump highest to get rid of it
        playableCards.sort((a, b) => b.value - a.value);
        return playableCards[0];
      } else {
        // CANNOT FOLLOW SUIT: Discard penalties onto opponents! (DUMP)
        // Check for King penalty cards to dump:
        if (contract.id === 'RIFKI') {
          const rifki = playableCards.find(c => c.suit === 'hearts' && c.rank === 'K');
          if (rifki) return rifki;
          const aceHeart = playableCards.find(c => c.suit === 'hearts' && c.rank === 'A');
          if (aceHeart) return aceHeart;
        }

        if (contract.id === 'KIZ_ALMAZ') {
          const queens = playableCards.filter(c => c.rank === 'Q');
          if (queens.length > 0) return queens[0];
        }

        if (contract.id === 'ERKEK_ALMAZ') {
          const male = playableCards.filter(c => ['J', 'K'].includes(c.rank));
          if (male.length > 0) {
            male.sort((a, b) => b.value - a.value);
            return male[0];
          }
        }

        if (contract.id === 'KUPA_ALMAZ') {
          const hearts = playableCards.filter(c => c.suit === 'hearts');
          if (hearts.length > 0) {
            hearts.sort((a, b) => b.value - a.value);
            return hearts[0]; // Dump highest heart
          }
        }

        // Dump highest cards in general to keep low cards for later
        playableCards.sort((a, b) => b.value - a.value);
        return playableCards[0];
      }
    }
  }
}
