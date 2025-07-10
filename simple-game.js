// ==============================
// simple-game.js - ゲームのロジック
// プレイヤーとコンピュータの勝敗判定
// スコアの更新
// ゲームのリセット機能
// ==============================

// スコアを保持する変数
let playerScore   = 0;
let computerScore = 0;

// DOM要素を取得
const choices               = document.querySelectorAll('.choice');
const playerScoreElement    = document.getElementById('player-score');
const computerScoreElement  = document.getElementById('computer-score');
const resultElement         = document.getElementById('result');
const computerChoiceElement = document.getElementById('computer-choice');
const resetButton           = document.getElementById('reset');

// コンピュータの手をランダムに選択する関数
function getComputerChoice() {
    const choices     = ['rock', 'paper', 'scissors'];
    const randomIndex = Math.floor(Math.random() * 3);
    return choices[randomIndex];
}

// 手の絵文字を返す関数
function getEmoji(choice) {
    const emojis = {
        'rock':     '✊',
        'paper':    '✋',
        'scissors': '✌️'
    };
    return emojis[choice] || '';
}

// 勝敗を判定する関数
function getWinner(player, computer) {
    // 引き分け
    if (player === computer) {
        return 'draw';
    }
    
    // 勝ち負け
    if ((player === 'rock'     && computer === 'scissors') ||
        (player === 'paper'    && computer === 'rock') ||
        (player === 'scissors' && computer === 'paper')) {
        // playerの勝ち
        return 'player';
    } else {
        // computerの勝ち
        return 'computer';
    }
}

// ゲームを進行する関数
function playGame(e) {
    const playerChoice   = e.target.dataset.choice;
    const computerChoice = getComputerChoice();
    
    // コンピュータの手を表示
    computerChoiceElement.textContent = `コンピュータの手: ${getEmoji(computerChoice)}`;
    
    // 勝敗を判定
    const winner = getWinner(playerChoice, computerChoice);
    
    // 結果を表示してスコアを更新
    if (winner === 'player') {
        // playerの勝ち
        resultElement.textContent = 'あなたの勝ちです！';
        playerScore++;
        playerScoreElement.textContent = playerScore;
    } else if (winner === 'computer') {
        // computerの勝ち
        resultElement.textContent = 'コンピュータの勝ちです！';
        computerScore++;
        computerScoreElement.textContent = computerScore;
    } else {
        // 引き分け
        resultElement.textContent = '引き分けです！';
    }
}

// ゲームをリセットする関数
function resetGame() {
    playerScore                       = 0;
    computerScore                     = 0;
    playerScoreElement.textContent    = '0';
    computerScoreElement.textContent  = '0';
    resultElement.textContent         = '選んでください！';
    computerChoiceElement.textContent = '';
}

// イベントリスナーを追加
// じゃんけんの選択ボタンを押すとplayGameを呼び出す
choices.forEach(choice => {
    choice.addEventListener('click', playGame);
});

// リセットボタンを押すとリセットする
resetButton.addEventListener('click', resetGame);
