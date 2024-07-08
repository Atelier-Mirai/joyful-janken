// 定数宣言
const DRAW  = 0 // 引き分け
const LOSE  = 1 // 負け
const WIN   = 2 // 勝ち

const GUU   = 0 // グー
const CHOKI = 1 // チョキ
const PAA   = 2 // パー

const FPS   = 8 // 一秒間あたり、8コマ表示する
let   computer  // コンピュータの手(グー:0, チョキ:1, パー:2)

// グローバル変数宣言
let isPause = true // グー・チョキ・パーの切替アニメを制御する為の変数

// コンピュータの手を切り替えする処理
const shuffleHand = () => {
  if(!isPause){ // 停止中でなければ
    computer = rand(0, 2) // コンピュータの手(グー:0, チョキ:1, パー:2)
    document.querySelector("#hand").src = ["images/guu.webp", "images/choki.webp", "images/paa.webp"][computer]
    document.querySelector("#hand").alt = ["グー", "チョキ", "パー"][computer]
  }

  // 一定間隔で、shuffleHand 関数を呼び続ける
  setTimeout(shuffleHand, 1000 / FPS)
}

// ボタン初期化関数
const initButton = () => {
  const guuButton   = document.querySelector("#guu")
  const chokiButton = document.querySelector("#choki")
  const paaButton   = document.querySelector("#paa")
  // グー・チョキ・パー ぞれぞれのボタンが押されたときに、
  // jankenHandler関数が呼ばれるように、登録する。
  guuButton.addEventListener("click", jankenHandler)
  chokiButton.addEventListener("click", jankenHandler)
  paaButton.addEventListener("click", jankenHandler)

  // playボタンがクリックされた時には、resume関数を実行して、
  // じゃんけんの切替アニメが再開(resume)されるようにする
  const playButton = document.querySelector("#play")
  playButton.addEventListener("click", resume)
}

// じゃんけんの勝敗を取り扱う関数
const jankenHandler = (event) => {
  // 「開始」ボタンが押された際に、ボタンの表示を「もう一度」に更新する
  const playButton = document.querySelector("#play")
  playButton.innerText = "もう一度"

  // 切替アニメ停止処理実行
  pause()

  // プレイヤーの手の取得
  const player = Number(event.target.value)
  // 勝敗結果の取得
  const result = judge(player, computer)
  // 勝敗に応じ、メッセージ表示＆勝敗更新
  if (result === DRAW) {
    alert("引き分けです")
  } else if (result === LOSE) {
    alert("あなたの負けです")
    // 敗数を一つ増やす
    updateScore(LOSE)
  } else {
    alert("あなたの勝ちです")
    // 勝数を一つ増やす
    updateScore(WIN)
  }
}

// じゃんけんの効果的な勝敗判定アルゴリズム
const judge = (player, computer) => {
  return (player - computer + 3) % 3
}

// 勝敗更新処理
const updateScore = (result) => {
  const win  = document.querySelector("#win")
  const lose = document.querySelector("#lose")

  if (result === WIN) { // 勝ちの場合
    win.innerText = Number(win.textContent) + 1 // 勝数を一つ増やす
  } else if (result === LOSE) {
    lose.innerText = Number(lose.textContent) + 1
  }
}

// 切替アニメ停止処理
const pause = () => {
  isPause = true
}

// 切替アニメ再開処理
const resume = () => {
  isPause = false
}

// 乱数を返す関数
// rand(0, 2)と呼び出せば、0, 1, 2 と グーチョキパー の乱数を返す
const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 実際の処理の開始
initButton()  // ボタンの初期化を行う。
pause()       // 切替アニメを停止状態にする。
shuffleHand() // 切替アニメを実行待ちにする。
              // 開始ボタンが押されると切替アニメが実行される。
