// King Card Game - Core State Machine and Match Flow
import {
  createDeck,
  shuffleDeck,
  sortHand
} from './cards.js';
import {
  CONTRACT_TYPES,
  ALL_PENALTIES,
  ALL_TRUMPS,
  getPlayableCards,
  determineTrickWinner,
  calculateTrickScores,
  doesTrickBreakHearts
} from './kingRules.js';
import { KingAI } from './ai.js';
import { sound } from './sound.js';

export const PLAYER_NAMES = ['Sen (Güney)', 'Ali (Batı)', 'Ayşe (Kuzey)', 'Can (Doğu)'];

export class KingGame {
  constructor(hh, table3d) {
    this.hh = hh;
    this.table3d = table3d;

    // AI Opponents
    this.aiPlayers = [
      null, // Player 0 is Human
      new KingAI(1, 'Ali'),
      new KingAI(2, 'Ayşe'),
      new KingAI(3, 'Can'),
    ];

    this.mode = 'QUICK'; // 'QUICK' (4 hands), 'FULL' (20 hands), 'PRACTICE'
    this.totalHandsInGame = 4;
    this.currentHandNumber = 0; // 0 to total-1

    // Overall Match Scores
    this.totalScores = [0, 0, 0, 0];
    this.contractsUsed = [
      { penalties: new Set(), trumps: new Set() },
      { penalties: new Set(), trumps: new Set() },
      { penalties: new Set(), trumps: new Set() },
      { penalties: new Set(), trumps: new Set() },
    ];

    // Current Hand Variables
    this.dealer = 0;
    this.declarer = 0; // Player who chooses contract
    this.contract = null;
    this.hands = [[], [], [], []];
    this.trickIndex = 0; // 0 to 12
    this.currentTrick = []; // [{ playerId, card }]
    this.turn = 0; // Whose turn to play (0..3)
    this.heartsBroken = false;
    this.selectedCardIndex = 0;

    // State
    this.state = 'TITLE'; // 'TITLE', 'CONTRACT_MENU', 'PLAYING', 'TRICK_END', 'HAND_SUMMARY', 'GAME_OVER'
    this.timer = 0;
    this.stateMessage = '';
    this.trickResultMessage = '';

    // Penalty Tracking Counter
    this.penaltyTracker = {
      remainingQueens: 4,
      remainingMales: 8,
      remainingHearts: 13,
      rifkiPlayed: false,
      rifkiWinner: null,
    };

    // History & Stats
    this.stats = hh.load('king_stats', { played: 0, won: 0, bestScore: -9999 });

    // Menu selections
    this.titleMenuIndex = 0;
    this.contractMenuIndex = 0;
    this.showScoreboard = false;
    this.showRuleHelp = false;
  }

  startNewGame(mode = 'QUICK') {
    this.mode = mode;
    this.totalHandsInGame = mode === 'FULL' ? 20 : (mode === 'QUICK' ? 4 : 1);
    this.currentHandNumber = 0;
    this.totalScores = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      this.contractsUsed[i] = { penalties: new Set(), trumps: new Set() };
    }
    this.dealer = 3;
    this.declarer = 0;
    this.showScoreboard = false;
    this.showRuleHelp = false;
    this.setupNextHand();
  }

  setupNextHand() {
    this.table3d.releaseAllCards();
    this.currentHandNumber++;
    this.dealer = (this.dealer + 1) % 4;
    this.declarer = this.dealer; // In King, dealer declares contract
    this.trickIndex = 0;
    this.currentTrick = [];
    this.heartsBroken = false;
    this.contract = null;
    this.selectedCardIndex = 0;
    this.trickResultMessage = '';

    // Reset penalty tracking for current hand
    this.penaltyTracker = {
      remainingQueens: 4,
      remainingMales: 8,
      remainingHearts: 13,
      rifkiPlayed: false,
      rifkiWinner: null,
    };

    // Deal 52 cards, 13 to each
    const deck = shuffleDeck(createDeck());
    this.hands = [
      sortHand(deck.slice(0, 13)),
      sortHand(deck.slice(13, 26)),
      sortHand(deck.slice(26, 39)),
      sortHand(deck.slice(39, 52)),
    ];

    // Check if Declarer is Human or AI
    if (this.declarer === 0) {
      this.state = 'CONTRACT_MENU';
      this.contractMenuIndex = 0;
      this.stateMessage = 'Kontrat Seçimi Sırası Sende!';
    } else {
      // AI Declarer picks contract
      this.state = 'AI_DECLARING';
      this.timer = 0.9;
      this.stateMessage = `${PLAYER_NAMES[this.declarer]} kontrat seçiyor...`;
    }
  }

  getAvailableContractsForPlayer(playerId) {
    const used = this.contractsUsed[playerId];
    const available = [];

    // In QUICK mode: 1 penalty or 1 trump per player
    // In FULL mode: 3 penalties and 2 trumps per player
    const maxPenalties = this.mode === 'FULL' ? 3 : 1;
    const maxTrumps = this.mode === 'FULL' ? 2 : 1;

    if (used.penalties.size < maxPenalties) {
      for (const p of ALL_PENALTIES) {
        if (!used.penalties.has(p)) available.push(p);
      }
    }
    if (used.trumps.size < maxTrumps) {
      for (const t of ALL_TRUMPS) {
        if (!used.trumps.has(t)) available.push(t);
      }
    }

    if (available.length === 0) {
      return [ALL_PENALTIES[0]]; // fallback
    }
    return available;
  }

  applyContract(contract) {
    this.contract = contract;
    const used = this.contractsUsed[this.declarer];
    if (contract.type === 'penalty') {
      used.penalties.add(contract.id);
    } else {
      used.trumps.add(contract.id);
    }

    sound.playFanfare();

    // Leader of first trick is the player to the left of dealer (declarer)
    this.turn = (this.declarer + 1) % 4;
    this.state = 'PLAYING';
    this.stateMessage = `${PLAYER_NAMES[this.declarer]}: ${contract.name}`;
    this.timer = 0.6;
  }

  // Current playable cards for human
  getHumanPlayableCards() {
    if (this.hands[0].length === 0) return [];
    return getPlayableCards(this.hands[0], this.currentTrick, this.contract, this.heartsBroken);
  }

  playHumanCard() {
    const playable = this.getHumanPlayableCards();
    const selectedCard = this.hands[0][this.selectedCardIndex];
    if (!selectedCard) return false;

    // Check legality
    const isLegal = playable.some(c => c.id === selectedCard.id);
    if (!isLegal) {
      this.stateMessage = 'Bu kartı oynayamazsın! Renk uymalısın.';
      return false;
    }

    sound.playCardPlay();

    // Play card
    this.hands[0].splice(this.selectedCardIndex, 1);
    if (this.selectedCardIndex >= this.hands[0].length) {
      this.selectedCardIndex = Math.max(0, this.hands[0].length - 1);
    }

    this.currentTrick.push({ playerId: 0, card: selectedCard });
    this.table3d.playCardToCenter(0, selectedCard);

    if (doesTrickBreakHearts([{ card: selectedCard }])) {
      this.heartsBroken = true;
    }

    this.advanceTurn();
    return true;
  }

  playAICard(botId) {
    const hand = this.hands[botId];
    const playable = getPlayableCards(hand, this.currentTrick, this.contract, this.heartsBroken);
    const ai = this.aiPlayers[botId];
    const chosenCard = ai.chooseCard(playable, this.currentTrick, this.contract, this.trickIndex);

    sound.playCardPlay();

    // Remove from hand
    const idx = hand.findIndex(c => c.id === chosenCard.id);
    if (idx !== -1) hand.splice(idx, 1);

    this.currentTrick.push({ playerId: botId, card: chosenCard });
    this.table3d.playCardToCenter(botId, chosenCard);

    if (doesTrickBreakHearts([{ card: chosenCard }])) {
      this.heartsBroken = true;
    }

    this.advanceTurn();
  }

  advanceTurn() {
    if (this.currentTrick.length === 4) {
      // Trick complete!
      this.state = 'TRICK_END';
      this.timer = 1.35;
      const winnerId = determineTrickWinner(this.currentTrick, this.contract);
      const { scores, pointsEarned } = calculateTrickScores(this.currentTrick, this.trickIndex, this.contract, winnerId);

      this.totalScores[winnerId] += pointsEarned;
      this.trickWinner = winnerId;
      this.trickPoints = pointsEarned;

      // Update penalty tracking
      if (this.contract.id === 'KIZ_ALMAZ') {
        const queensInTrick = this.currentTrick.filter(t => t.card.rank === 'Q').length;
        this.penaltyTracker.remainingQueens = Math.max(0, this.penaltyTracker.remainingQueens - queensInTrick);
      } else if (this.contract.id === 'ERKEK_ALMAZ') {
        const malesInTrick = this.currentTrick.filter(t => ['J', 'K'].includes(t.card.rank)).length;
        this.penaltyTracker.remainingMales = Math.max(0, this.penaltyTracker.remainingMales - malesInTrick);
      } else if (this.contract.id === 'KUPA_ALMAZ') {
        const heartsInTrick = this.currentTrick.filter(t => t.card.suit === 'hearts').length;
        this.penaltyTracker.remainingHearts = Math.max(0, this.penaltyTracker.remainingHearts - heartsInTrick);
      } else if (this.contract.id === 'RIFKI') {
        const hasRifki = this.currentTrick.some(t => t.card.suit === 'hearts' && t.card.rank === 'K');
        if (hasRifki) {
          this.penaltyTracker.rifkiPlayed = true;
          this.penaltyTracker.rifkiWinner = winnerId;
        }
      }

      if (this.contract.id === 'RIFKI' && this.penaltyTracker.rifkiWinner === winnerId && this.trickPoints < 0) {
        sound.playRifkiAlert();
      } else {
        sound.playCollect();
      }

      const ptsText = pointsEarned !== 0 ? ` (${pointsEarned > 0 ? '+' : ''}${pointsEarned} Puan)` : '';
      this.trickResultMessage = `Eli ${PLAYER_NAMES[winnerId]} aldı${ptsText}`;
    } else {
      // Next player's turn
      this.turn = (this.turn + 1) % 4;
      this.timer = this.turn === 0 ? 0 : 0.65;
    }
  }

  resolveTrickEnd() {
    this.table3d.collectTrickToWinner(this.trickWinner, () => {
      this.currentTrick = [];
      this.trickIndex++;

      if (this.trickIndex >= 13) {
        // Hand is over!
        this.state = 'HAND_SUMMARY';
        this.timer = 2.5;
        this.stateMessage = `El Tamamlandı! Toplam Puan: ${this.totalScores[0]}`;
      } else {
        // Next trick led by winner of previous trick
        this.turn = this.trickWinner;
        this.state = 'PLAYING';
        this.trickResultMessage = '';
        this.timer = this.turn === 0 ? 0 : 0.55;
      }
    });
  }

  update(dt, input) {
    this.table3d.update(dt);

    // Render human hand and bot representation
    if (['PLAYING', 'TRICK_END', 'CONTRACT_MENU', 'AI_DECLARING'].includes(this.state)) {
      const playable = this.state === 'PLAYING' && this.turn === 0 ? this.getHumanPlayableCards() : this.hands[0];
      this.table3d.renderPlayerHand(this.hands[0], this.selectedCardIndex, playable);
      this.table3d.renderBotHands({
        1: this.hands[1].length,
        2: this.hands[2].length,
        3: this.hands[3].length,
      });
    }

    // Toggle Scoreboard overlay with X button
    if (input.pressed('X')) {
      this.showScoreboard = !this.showScoreboard;
      if (this.showScoreboard) this.showRuleHelp = false;
    }

    // Toggle Rule help popup with Y button
    if (input.pressed('Y')) {
      this.showRuleHelp = !this.showRuleHelp;
      if (this.showRuleHelp) this.showScoreboard = false;
    }

    // Close overlays with B button
    if (input.pressed('B')) {
      if (this.showScoreboard || this.showRuleHelp) {
        this.showScoreboard = false;
        this.showRuleHelp = false;
      }
    }

    if (this.showScoreboard || this.showRuleHelp) {
      return; // Pause game interactions while viewing sheets
    }

    // State handling
    switch (this.state) {
      case 'TITLE':
        this.handleTitleInput(input);
        break;

      case 'AI_DECLARING':
        this.timer -= dt;
        if (this.timer <= 0) {
          const available = this.getAvailableContractsForPlayer(this.declarer);
          const ai = this.aiPlayers[this.declarer];
          const chosen = ai.chooseContract(available, this.hands[this.declarer]);
          this.applyContract(chosen);
        }
        break;

      case 'CONTRACT_MENU':
        this.handleContractMenuInput(input);
        break;

      case 'PLAYING':
        if (this.turn === 0) {
          // Human turn
          this.handleHumanPlayInput(input);
        } else {
          // AI turn
          this.timer -= dt;
          if (this.timer <= 0) {
            this.playAICard(this.turn);
          }
        }
        break;

      case 'TRICK_END':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'TRICK_COLLECTING';
          this.resolveTrickEnd();
        }
        break;

      case 'HAND_SUMMARY':
        this.timer -= dt;
        if (this.timer <= 0 || input.pressed('A') || input.pressed('START')) {
          if (this.currentHandNumber >= this.totalHandsInGame) {
            this.state = 'GAME_OVER';
            this.stats.played++;
            if (this.totalScores[0] > Math.max(this.totalScores[1], this.totalScores[2], this.totalScores[3])) {
              this.stats.won++;
            }
            if (this.totalScores[0] > this.stats.bestScore) {
              this.stats.bestScore = this.totalScores[0];
            }
            this.hh.save('king_stats', this.stats);
          } else {
            this.setupNextHand();
          }
        }
        break;

      case 'GAME_OVER':
        if (input.pressed('A') || input.pressed('START')) {
          this.state = 'TITLE';
        }
        break;
    }
  }

  handleTitleInput(input) {
    if (input.pressed('UP')) {
      this.titleMenuIndex = Math.max(0, this.titleMenuIndex - 1);
      sound.playSelect();
    }
    if (input.pressed('DOWN')) {
      this.titleMenuIndex = Math.min(2, this.titleMenuIndex + 1);
      sound.playSelect();
    }
    if (input.pressed('A') || input.pressed('START')) {
      sound.playSelect();
      if (this.titleMenuIndex === 0) {
        this.startNewGame('QUICK'); // 4 rounds
      } else if (this.titleMenuIndex === 1) {
        this.startNewGame('FULL');  // 20 rounds
      } else {
        this.showRuleHelp = true;
      }
    }
  }

  handleContractMenuInput(input) {
    const available = this.getAvailableContractsForPlayer(0);
    if (input.pressed('UP')) {
      this.contractMenuIndex = Math.max(0, this.contractMenuIndex - 1);
      sound.playSelect();
    }
    if (input.pressed('DOWN')) {
      this.contractMenuIndex = Math.min(available.length - 1, this.contractMenuIndex + 1);
      sound.playSelect();
    }
    if (input.pressed('A')) {
      const chosenId = available[this.contractMenuIndex];
      this.applyContract(CONTRACT_TYPES[chosenId]);
    }
  }

  handleHumanPlayInput(input) {
    const hand = this.hands[0];
    if (hand.length === 0) return;

    if (input.pressed('LEFT')) {
      this.selectedCardIndex = (this.selectedCardIndex - 1 + hand.length) % hand.length;
      sound.playSelect();
    }
    if (input.pressed('RIGHT')) {
      this.selectedCardIndex = (this.selectedCardIndex + 1) % hand.length;
      sound.playSelect();
    }
    if (input.pressed('A')) {
      this.playHumanCard();
    }
  }
}
