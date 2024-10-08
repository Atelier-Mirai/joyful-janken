// 定数宣言
// プログラム内で共通して使う定数を宣言する。
const DRAW  = 0 // あいこ
const LOSE  = 1 // 負け
const WIN   = 2 // 勝ち

// グローバル変数宣言
let computer    // コンピュータの手(グー:0, チョキ:1, パー:2)

// 乱数関数
// rand(0, 2)と呼ぶと 0, 1, 2 と グーチョキパー の乱数を返す
const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// computer の手を 乱数で設定する関数
const shuffleHand = () => {
  computer = rand(0, 2)
  // 設定できているか、確認する。
  console.log(`computer: ${computer}`)

  // コンピュータの手(0, 1, 2)によって、画像(や代替文字列)を変更する
  document.querySelector("#hand").src = ["images/guu.webp", "images/choki.webp", "images/paa.webp"][computer]
  document.querySelector("#hand").alt = ["グー", "チョキ", "パー"][computer]
}

// プレイヤーの手とコンピュータの手が与えられると、
// 0: 引き分け 1: 負け 2: 勝ち を返す関数
const judge = (player, computer) => {
  return (player - computer + 3) % 3
}

// じゃんけんの勝ち負けの結果を表示する関数
const jankenHandler = (event) => {
  // プレイヤーの手の取得
  const player = Number(event.target.value)
  // 取得できているか、確認する。
  console.log(`player:   ${player}`)

  // judge関数により、勝敗判定結果を得る。
  const result = judge(player, computer)
  // 判定できているか、確認する。
  console.log(`result:   ${result}`)

  // 勝敗に応じ、メッセージ表示
  if (result === DRAW) {
    alert("あいこです!")
  } else if (result === LOSE) {
    alert("あなたの負けです!")
  } else {
    alert("あなたの勝ちです!")
  }
}

// イベントリスナの設定
// グー・チョキ・パー ぞれぞれのボタンが押されたときに、
// jankenHandler関数が呼ばれるように、登録する。
const guuButton   = document.querySelector("#guu")
const chokiButton = document.querySelector("#choki")
const paaButton   = document.querySelector("#paa")
guuButton.addEventListener("click", jankenHandler)
chokiButton.addEventListener("click", jankenHandler)
paaButton.addEventListener("click", jankenHandler)

// コンピュータの手を変更する処理を呼び出す
shuffleHand()
