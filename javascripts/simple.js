// ==============================
// simple.js — シンプル版じゃんけんのロジック
// ・プレイヤーとコンピュータの勝敗判定
// ・スコアの更新
// ・ゲームのリセット
// ==============================

// 厳格モード：宣言し忘れた変数などのうっかりミスを、エラーとして知らせてもらう
'use strict';

// ---- じゃんけんの手 ----
// 手ごとに「表示する絵文字」「日本語の名前」「勝てる相手」をまとめておく。
// 勝敗のルールをここに集めると、判定の if 文が短くなる。
const HANDS = {
  rock:     { emoji: '✊', label: 'グー',   beats: 'scissors' },
  scissors: { emoji: '✌️', label: 'チョキ', beats: 'paper' },
  paper:    { emoji: '✋', label: 'パー',   beats: 'rock' },
};

// 勝敗ごとのメッセージ
const MESSAGES = {
  player:   'あなたの勝ちです！',
  computer: 'コンピュータの勝ちです！',
  draw:     '引き分けです！',
};

// ---- スコア（画面とは別のデータとして持つ） ----
const scores = { player: 0, computer: 0 };

// ---- 画面の部品を探す ----
// data-ui は表示する部品、data-action は操作する部品の目印。
const choiceButtons         = document.querySelectorAll('[data-choice]');
const playerScoreElement    = document.querySelector('[data-ui="player-score"]');
const computerScoreElement  = document.querySelector('[data-ui="computer-score"]');
const resultElement         = document.querySelector('[data-ui="result"]');
const computerChoiceElement = document.querySelector('[data-ui="computer-choice"]');
const resetButton           = document.querySelector('[data-action="reset"]');

// コンピュータの手をランダムに選ぶ
function getComputerChoice() {
  const choices = Object.keys(HANDS);  // ['rock', 'scissors', 'paper']
  const randomIndex = Math.floor(Math.random() * choices.length);
  return choices[randomIndex];
}

// 勝敗を判定する（'player'・'computer'・'draw' のどれかを返す）
function getWinner(player, computer) {
  if (player === computer) {
    return 'draw';
  }
  // 自分の手が勝てる相手と、コンピュータの手が同じなら勝ち
  return HANDS[player].beats === computer ? 'player' : 'computer';
}

// スコアのデータを画面に映す
function renderScores() {
  playerScoreElement.textContent   = scores.player;
  computerScoreElement.textContent = scores.computer;
}

// ボタンが押されたら 1 回勝負する
function playGame(event) {
  // currentTarget は「イベントを登録したボタン」を指す
  const playerChoice   = event.currentTarget.dataset.choice;
  const computerChoice = getComputerChoice();
  const winner         = getWinner(playerChoice, computerChoice);

  // 先にデータを変えてから、画面を更新する
  if (winner !== 'draw') {
    scores[winner]++;
  }
  renderScores();

  resultElement.textContent = MESSAGES[winner];
  // CSS で勝ち・負け・引き分けの色を変えられるよう、状態を data 属性で渡す
  resultElement.dataset.winner = winner;

  const { emoji, label } = HANDS[computerChoice];
  computerChoiceElement.textContent = `コンピュータの手: ${emoji}（${label}）`;
}

// ゲームをリセットする
function resetGame() {
  scores.player   = 0;
  scores.computer = 0;
  renderScores();

  resultElement.textContent = '手を選んでください！';
  delete resultElement.dataset.winner;
  computerChoiceElement.textContent = '';
}

// ---- ボタンに処理をつなぐ ----
for (const button of choiceButtons) {
  button.addEventListener('click', playGame);
}
resetButton.addEventListener('click', resetGame);

// 最初の表示もデータから作り、画面とデータを揃える
renderScores();
