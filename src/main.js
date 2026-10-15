// PocketVibe - King (Rıfkı) Card Game
// Main Game Entry Point

import { createHandheld } from './handheld.js';
import { Table3D } from './table3d.js';
import { KingGame, PLAYER_NAMES } from './game.js';
import { CONTRACT_TYPES } from './kingRules.js';
import { SUIT_NAMES_TR, SUIT_SYMBOLS } from './cards.js';

const hh = createHandheld({ clearColor: 0x0a1f13 });
const { input, hud } = hh;

// Initialize 3D Table and Game Engine
const table3d = new Table3D(hh);
const game = new KingGame(hh, table3d);

// Set up HUD DOM Structure once
hud.innerHTML = `
  <div class="top-bar">
    <div id="contract-badge" class="badge contract-badge">👑 KING</div>
    <div id="penalty-badge" class="badge penalty-badge" style="display:none;"></div>
    <div id="round-badge" class="badge">El: 1 / 4</div>
    <div id="score-badge" class="badge score-badge">Skorun: 0</div>
  </div>

  <div id="tag-west" class="opponent-tag tag-west">Ali</div>
  <div id="tag-north" class="opponent-tag tag-north">Ayşe</div>
  <div id="tag-east" class="opponent-tag tag-east">Can</div>

  <div id="center-message" class="center-banner" style="display:none;"></div>

  <!-- Bottom Bar: Hand Ribbon & Active Card Status -->
  <div class="bottom-bar">
    <div id="hand-ribbon" class="hand-ribbon"></div>
    <div class="selection-info-row">
      <div id="card-indicator" class="card-title-badge">Kart Seç</div>
      <div id="hint-indicator" class="controls-hint">◄ ► Seç · A Oyna · X Skor · Y Kural</div>
    </div>
  </div>

  <!-- Title Screen Modal -->
  <div id="modal-title" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-title">👑 KRAL KING (RIFKI)</div>
      <p style="font-size:18px; color:#cbd5e1; margin-bottom:12px;">El Konsolları için Türk Usulü King Kart Oyunu</p>
      <div class="menu-list">
        <div id="menu-opt-0" class="menu-item selected">
          <span>⚡ Hızlı Oyun (4 El)</span>
          <span style="font-size:14px; color:#93c5fd;">Her oyuncu 1 kontrat</span>
        </div>
        <div id="menu-opt-1" class="menu-item">
          <span>🏆 Klasik Tam King (20 El)</span>
          <span style="font-size:14px; color:#93c5fd;">12 Ceza + 8 Koz</span>
        </div>
        <div id="menu-opt-2" class="menu-item">
          <span>📖 Kurallar ve Puanlar</span>
          <span style="font-size:14px; color:#93c5fd;">Y tuşu</span>
        </div>
      </div>
      <div class="controls-hint">▲ ▼ Seç · A Başla</div>
    </div>
  </div>

  <!-- Contract Selection Modal with Split Hand Preview -->
  <div id="modal-contract" class="modal-overlay" style="display:none;">
    <div class="modal-contract-box">
      <div class="modal-title" style="margin-bottom:4px;">👑 KONTRATINI SEÇ</div>
      <p style="font-size:15px; color:#94a3b8; margin:0 0 8px 0; text-align:center;">
        Elindeki kartlara bakarak en uygun cezayı veya kozu belirle:
      </p>

      <div class="contract-split">
        <!-- Left: Contract Menu Options -->
        <div id="contract-list" class="contract-options-col"></div>

        <!-- Right: Hand Distribution Preview -->
        <div class="hand-preview-col">
          <div style="font-weight:900; color:#ffd166; border-bottom:1.5px solid #2d3e38; padding-bottom:4px;">
            🎴 ELİNDEKİ KARTLAR (13 Kart)
          </div>
          <div id="preview-spades" class="hand-suit-row">
            <span class="hand-suit-label" style="color:#94a3b8;">♠ Maça:</span>
            <span id="preview-spades-cards" class="hand-suit-cards">-</span>
          </div>
          <div id="preview-hearts" class="hand-suit-row">
            <span class="hand-suit-label" style="color:#f87171;">♥ Kupa:</span>
            <span id="preview-hearts-cards" class="hand-suit-cards">-</span>
          </div>
          <div id="preview-diamonds" class="hand-suit-row">
            <span class="hand-suit-label" style="color:#f87171;">♦ Karo:</span>
            <span id="preview-diamonds-cards" class="hand-suit-cards">-</span>
          </div>
          <div id="preview-clubs" class="hand-suit-row">
            <span class="hand-suit-label" style="color:#94a3b8;">♣ Sinek:</span>
            <span id="preview-clubs-cards" class="hand-suit-cards">-</span>
          </div>
          <div id="preview-rifki-status" class="rifki-alert rifki-safe">
            Rıfkı (K♥) Sende Yok!
          </div>
        </div>
      </div>

      <div class="controls-hint" style="text-align:center;">▲ ▼ Seç · A ile Onayla ve Başla</div>
    </div>
  </div>

  <!-- Scoreboard Modal (Toggled with X) -->
  <div id="modal-scores" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <div class="modal-title">📊 MAÇ SKOR TABLOSU</div>
      <table class="scoreboard-table">
        <thead>
          <tr>
            <th>Oyuncu</th>
            <th>Puan</th>
            <th>Cezalar</th>
            <th>Kozlar</th>
          </tr>
        </thead>
        <tbody id="scores-tbody"></tbody>
      </table>
      <div class="controls-hint">B / X : Kapat</div>
    </div>
  </div>

  <!-- Rules Help Modal (Toggled with Y) -->
  <div id="modal-rules" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <div class="modal-title">📖 KING NASIL OYNANIR?</div>
      <div class="rule-box">
        <p>• <b>Cezalar:</b><br>
        - <b>El Almaz:</b> El başı -50 puan<br>
        - <b>Kupa Almaz:</b> Her Kupa kartı -30 puan (Kupa açılmadan başlanamaz)<br>
        - <b>Erkek Almaz:</b> Her Vale/Papaz -60 puan<br>
        - <b>Kız Almaz:</b> Her Kız -100 puan<br>
        - <b>Rıfkı:</b> Kupa Papazı (K♥) -320 puan!<br>
        - <b>Son İki:</b> 12 ve 13. el -180 puan</p>
        <p>• <b>Koz Oyunları:</b> Koz rengi belirlenir, alınan her el +50 puan kazandırır.</p>
        <p>• <b>Kural:</b> Masada açılan renge uymak zorunludur! Renk yoksa ceza kartı atılabilir veya koz çakılabilir.</p>
      </div>
      <div class="controls-hint" style="margin-top:10px;">B / Y : Kapat</div>
    </div>
  </div>

  <!-- Game Over Screen -->
  <div id="modal-gameover" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <div id="gameover-title" class="modal-title">OYUN BİTTİ!</div>
      <p id="gameover-summary" style="font-size:22px; font-weight:800; color:#48cae4;"></p>
      <div class="controls-hint" style="margin-top:16px;">A : Ana Menüye Dön</div>
    </div>
  </div>
`;

// Element references
const elContractBadge = document.getElementById('contract-badge');
const elPenaltyBadge = document.getElementById('penalty-badge');
const elRoundBadge = document.getElementById('round-badge');
const elScoreBadge = document.getElementById('score-badge');
const elTagWest = document.getElementById('tag-west');
const elTagNorth = document.getElementById('tag-north');
const elTagEast = document.getElementById('tag-east');
const elCenterMsg = document.getElementById('center-message');
const elHandRibbon = document.getElementById('hand-ribbon');
const elCardIndicator = document.getElementById('card-indicator');
const elHintIndicator = document.getElementById('hint-indicator');

// Dual-Screen (e.g. Anbernic RG DS) Initialization
let elSecondScoresTbody = null;
let elSecondPenaltyBox = null;
if (hh.second) {
  hh.second.hud.innerHTML = `
    <div class="second-screen-container">
      <div class="second-screen-title">📊 CANLI PUAN & CEZA DURUMU</div>
      <table class="scoreboard-table second-table">
        <thead>
          <tr>
            <th>Oyuncu</th>
            <th>Puan</th>
            <th>Cezalar</th>
            <th>Kozlar</th>
          </tr>
        </thead>
        <tbody id="second-scores-tbody"></tbody>
      </table>
      <div id="second-penalty-box" class="second-penalty-box"></div>
      <div class="second-controls-info">D-pad: Kart Seç · A: Oyna · X: Skor Tablosu · Y: Kurallar</div>
    </div>
  `;
  elSecondScoresTbody = hh.second.hud.querySelector('#second-scores-tbody');
  elSecondPenaltyBox = hh.second.hud.querySelector('#second-penalty-box');
}

const elModalTitle = document.getElementById('modal-title');
const elModalContract = document.getElementById('modal-contract');
const elContractList = document.getElementById('contract-list');
const elPreviewSpades = document.getElementById('preview-spades-cards');
const elPreviewHearts = document.getElementById('preview-hearts-cards');
const elPreviewDiamonds = document.getElementById('preview-diamonds-cards');
const elPreviewClubs = document.getElementById('preview-clubs-cards');
const elPreviewRifki = document.getElementById('preview-rifki-status');

const elModalScores = document.getElementById('modal-scores');
const elScoresTbody = document.getElementById('scores-tbody');
const elModalRules = document.getElementById('modal-rules');
const elModalGameOver = document.getElementById('modal-gameover');
const elGameOverTitle = document.getElementById('gameover-title');
const elGameOverSummary = document.getElementById('gameover-summary');

// Cached state variables to minimize DOM operations
let lastState = '';
let lastContractText = '';
let lastPenaltyText = '';
let lastRoundText = '';
let lastScore = -99999;
let lastSelectedCardId = -1;
let lastSelectedPlayable = null;
let lastHandLength = -1;
let lastCenterMsgText = '';
let lastTurn = -1;
let lastTitleMenuIdx = -1;
let lastContractMenuIdx = -1;
let lastScoresVisible = false;
let lastRulesVisible = false;

// Populate Hand Preview in Contract Screen
function updateContractHandPreview(hand) {
  const suits = { spades: [], hearts: [], diamonds: [], clubs: [] };
  for (const c of hand) {
    suits[c.suit].push(c.rank);
  }

  elPreviewSpades.textContent = suits.spades.length > 0 ? `(${suits.spades.length}) ${suits.spades.join(' ')}` : 'Yok';
  elPreviewHearts.textContent = suits.hearts.length > 0 ? `(${suits.hearts.length}) ${suits.hearts.join(' ')}` : 'Yok';
  elPreviewDiamonds.textContent = suits.diamonds.length > 0 ? `(${suits.diamonds.length}) ${suits.diamonds.join(' ')}` : 'Yok';
  elPreviewClubs.textContent = suits.clubs.length > 0 ? `(${suits.clubs.length}) ${suits.clubs.join(' ')}` : 'Yok';

  const hasRifki = hand.some(c => c.suit === 'hearts' && c.rank === 'K');
  if (hasRifki) {
    elPreviewRifki.className = 'rifki-alert rifki-danger';
    elPreviewRifki.innerHTML = '⚠️ DİKKAT: Rıfkı (K♥) Sende!';
  } else {
    elPreviewRifki.className = 'rifki-alert rifki-safe';
    elPreviewRifki.innerHTML = '🛡️ Rıfkı (K♥) Sende Değil (Güvenli)';
  }
}

// Render Hand Cards Ribbon
function renderHandRibbon(hand, selectedIndex, playableCards) {
  const html = hand.map((card, idx) => {
    const isSelected = idx === selectedIndex;
    const isPlayable = playableCards.some(c => c.id === card.id);
    const suitClass = `suit-${card.suit}`;
    const stateClass = `${isSelected ? 'selected' : ''} ${!isPlayable ? 'unplayable' : ''}`;

    return `
      <div class="ribbon-card ${suitClass} ${stateClass}">
        <span>${card.rank}</span>
        <span style="font-size:13px;">${card.symbol}</span>
      </div>
    `;
  }).join('');

  elHandRibbon.innerHTML = html;
}

// Main Handheld Game Loop
hh.run((dt) => {
  // Update Game Logic
  game.update(dt, input);

  const state = game.state;
  const humanHand = game.hands[0] || [];
  const playable = (state === 'PLAYING' && game.turn === 0) ? game.getHumanPlayableCards() : humanHand;

  // 1. Modals visibility
  if (elModalTitle.style.display !== (state === 'TITLE' ? 'flex' : 'none')) {
    elModalTitle.style.display = state === 'TITLE' ? 'flex' : 'none';
  }

  if (state === 'TITLE' && game.titleMenuIndex !== lastTitleMenuIdx) {
    lastTitleMenuIdx = game.titleMenuIndex;
    for (let i = 0; i < 3; i++) {
      const opt = document.getElementById(`menu-opt-${i}`);
      if (opt) {
        if (i === lastTitleMenuIdx) opt.classList.add('selected');
        else opt.classList.remove('selected');
      }
    }
  }

  // Contract Menu with Hand Preview
  const isContractMenu = state === 'CONTRACT_MENU';
  if (elModalContract.style.display !== (isContractMenu ? 'flex' : 'none')) {
    elModalContract.style.display = isContractMenu ? 'flex' : 'none';
    if (isContractMenu) {
      updateContractHandPreview(humanHand);
      const available = game.getAvailableContractsForPlayer(0);
      elContractList.innerHTML = available.map((cId, idx) => {
        const item = CONTRACT_TYPES[cId];
        const isSelected = idx === game.contractMenuIndex;
        return `<div class="menu-item ${isSelected ? 'selected' : ''}">
          <span>${item.name}</span>
          <span style="font-size:14px; color:#93c5fd;">${item.desc}</span>
        </div>`;
      }).join('');
      lastContractMenuIdx = game.contractMenuIndex;
    }
  } else if (isContractMenu && game.contractMenuIndex !== lastContractMenuIdx) {
    lastContractMenuIdx = game.contractMenuIndex;
    const items = elContractList.querySelectorAll('.menu-item');
    items.forEach((item, idx) => {
      if (idx === lastContractMenuIdx) item.classList.add('selected');
      else item.classList.remove('selected');
    });
  }

  // Scoreboard Modal
  if (game.showScoreboard !== lastScoresVisible) {
    lastScoresVisible = game.showScoreboard;
    elModalScores.style.display = lastScoresVisible ? 'flex' : 'none';
    if (lastScoresVisible) {
      elScoresTbody.innerHTML = PLAYER_NAMES.map((name, i) => `
        <tr>
          <td style="color:${i === 0 ? '#48cae4' : '#fff'}">${name}</td>
          <td style="font-weight:bold; color:${game.totalScores[i] >= 0 ? '#4ade80' : '#f87171'}">${game.totalScores[i]}</td>
          <td>${game.contractsUsed[i].penalties.size} / ${game.mode === 'FULL' ? 3 : 1}</td>
          <td>${game.contractsUsed[i].trumps.size} / ${game.mode === 'FULL' ? 2 : 1}</td>
        </tr>
      `).join('');
    }
  }

  // Rules Modal
  if (game.showRuleHelp !== lastRulesVisible) {
    lastRulesVisible = game.showRuleHelp;
    elModalRules.style.display = lastRulesVisible ? 'flex' : 'none';
  }

  // Game Over Modal
  const isGameOver = state === 'GAME_OVER';
  if (elModalGameOver.style.display !== (isGameOver ? 'flex' : 'none')) {
    elModalGameOver.style.display = isGameOver ? 'flex' : 'none';
    if (isGameOver) {
      const bestScore = Math.max(...game.totalScores);
      const isWinner = game.totalScores[0] === bestScore;
      elGameOverTitle.textContent = isWinner ? '🎉 TEBRİKLER KAZANDIN! 🎉' : 'OYUN BİTTİ!';
      elGameOverSummary.innerHTML = `
        Senin Skorun: ${game.totalScores[0]}<br>
        En Yüksek Skor: ${bestScore}
      `;
    }
  }

  // Top Bar Info
  const contractText = game.contract ? `👑 ${game.contract.name}` : '👑 KING';
  if (contractText !== lastContractText) {
    lastContractText = contractText;
    elContractBadge.textContent = contractText;
  }

  // Penalty Tracking Badge Info
  let penaltyText = '';
  if (game.contract && ['PLAYING', 'TRICK_END'].includes(state)) {
    if (game.contract.id === 'KIZ_ALMAZ') {
      penaltyText = `Kalan Kız: ${game.penaltyTracker.remainingQueens}/4`;
    } else if (game.contract.id === 'ERKEK_ALMAZ') {
      penaltyText = `Kalan Erkek: ${game.penaltyTracker.remainingMales}/8`;
    } else if (game.contract.id === 'KUPA_ALMAZ') {
      penaltyText = `Kalan Kupa: ${game.penaltyTracker.remainingHearts}/13`;
    } else if (game.contract.id === 'RIFKI') {
      if (game.penaltyTracker.rifkiPlayed) {
        penaltyText = `⚠️ RIFKI ÇIKTI! (${PLAYER_NAMES[game.penaltyTracker.rifkiWinner]})`;
      } else {
        penaltyText = '🛡️ Rıfkı (K♥) Çıkmadı';
      }
    } else if (game.contract.id === 'SON_IKI') {
      penaltyText = game.trickIndex >= 11 ? '⚠️ DİKKAT: SON İKİ EL!' : 'Son İki: 12-13. El';
    } else if (game.contract.type === 'trump') {
      penaltyText = `Koz: ${game.contract.name}`;
    }
  }

  if (penaltyText !== lastPenaltyText) {
    lastPenaltyText = penaltyText;
    if (penaltyText) {
      elPenaltyBadge.textContent = penaltyText;
      elPenaltyBadge.style.display = 'block';
    } else {
      elPenaltyBadge.style.display = 'none';
    }
  }

  const roundText = `El: ${game.currentHandNumber} / ${game.totalHandsInGame} (Tur: ${game.trickIndex + 1}/13)`;
  if (roundText !== lastRoundText) {
    lastRoundText = roundText;
    elRoundBadge.textContent = roundText;
  }

  if (game.totalScores[0] !== lastScore) {
    lastScore = game.totalScores[0];
    elScoreBadge.textContent = `Skorun: ${lastScore}`;
  }

  // Second Screen Live Updates (Anbernic RG DS)
  if (hh.second && elSecondScoresTbody) {
    elSecondScoresTbody.innerHTML = PLAYER_NAMES.map((name, i) => `
      <tr>
        <td style="color:${i === 0 ? '#48cae4' : '#fff'}">${name}</td>
        <td style="font-weight:bold; color:${game.totalScores[i] >= 0 ? '#4ade80' : '#f87171'}">${game.totalScores[i]}</td>
        <td>${game.contractsUsed[i].penalties.size} / ${game.mode === 'FULL' ? 3 : 1}</td>
        <td>${game.contractsUsed[i].trumps.size} / ${game.mode === 'FULL' ? 2 : 1}</td>
      </tr>
    `).join('');

    if (elSecondPenaltyBox) {
      elSecondPenaltyBox.innerHTML = `
        <div><b>Aktif Kontrat:</b> ${game.contract ? game.contract.name : 'Seçilmedi'}</div>
        <div><b>Ceza Durumu:</b> ${penaltyText || 'Normal'}</div>
        <div><b>Mevcut El:</b> ${game.currentHandNumber} / ${game.totalHandsInGame} (Tur: ${game.trickIndex + 1}/13)</div>
      `;
    }
  }

  // Active turn highlighting on opponents
  if (game.turn !== lastTurn) {
    lastTurn = game.turn;
    elTagWest.className = `opponent-tag tag-west ${game.turn === 1 ? 'active-turn' : ''}`;
    elTagNorth.className = `opponent-tag tag-north ${game.turn === 2 ? 'active-turn' : ''}`;
    elTagEast.className = `opponent-tag tag-east ${game.turn === 3 ? 'active-turn' : ''}`;
  }

  // Center Message / Trick Result
  let centerText = '';
  if (state === 'TRICK_END') {
    centerText = game.trickResultMessage;
  } else if (state === 'AI_DECLARING') {
    centerText = game.stateMessage;
  } else if (state === 'HAND_SUMMARY') {
    centerText = game.stateMessage;
  }

  if (centerText !== lastCenterMsgText) {
    lastCenterMsgText = centerText;
    if (centerText) {
      elCenterMsg.textContent = centerText;
      elCenterMsg.style.display = 'block';
    } else {
      elCenterMsg.style.display = 'none';
    }
  }

  // Hand Ribbon & Selected Card Status
  const currentCard = humanHand[game.selectedCardIndex];
  const currentCardId = currentCard ? currentCard.id : -1;
  const isPlayable = currentCard ? playable.some(c => c.id === currentCard.id) : false;

  if (
    currentCardId !== lastSelectedCardId ||
    isPlayable !== lastSelectedPlayable ||
    humanHand.length !== lastHandLength
  ) {
    lastSelectedCardId = currentCardId;
    lastSelectedPlayable = isPlayable;
    lastHandLength = humanHand.length;

    renderHandRibbon(humanHand, game.selectedCardIndex, playable);

    if (currentCard) {
      const suitName = SUIT_NAMES_TR[currentCard.suit];
      if (game.turn === 0 && state === 'PLAYING') {
        if (isPlayable) {
          elCardIndicator.className = 'card-title-badge';
          elCardIndicator.innerHTML = `🃏 ${suitName} ${currentCard.rank} ${currentCard.symbol} &nbsp;<span style="color:#4ade80;">[✓ OYNANABİLİR: X / A]</span>`;
        } else {
          const leadSuitName = game.currentTrick[0] ? SUIT_NAMES_TR[game.currentTrick[0].card.suit] : '';
          elCardIndicator.className = 'card-title-badge invalid';
          elCardIndicator.innerHTML = `⚠️ ${suitName} ${currentCard.rank} &nbsp;<span style="color:#f87171;">[✕ ATILAMAZ: Masada ${leadSuitName} var]</span>`;
        }
      } else {
        elCardIndicator.className = 'card-title-badge';
        elCardIndicator.innerHTML = `🃏 ${suitName} ${currentCard.rank} ${currentCard.symbol}`;
      }
    } else {
      elCardIndicator.className = 'card-title-badge';
      elCardIndicator.textContent = 'Kart Yok';
    }
  }

  // Render 3D Scene
  table3d.render();
});
