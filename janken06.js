// 定数宣言
// プログラム内で共通して使う定数を宣言する。
const GUU   = 0 // グー
const CHOKI = 1 // チョキ
const PAA   = 2 // パー

// 乱数関数
// rand(0, 2)と呼ぶと 0, 1, 2 と グーチョキパー の乱数を返す
const rand = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// computer の手を 乱数で設定
let computer = rand(0, 2)
// 設定できているか、確認する。
console.log(`computer: ${computer}`)

// じゃんけんの勝ち負けの結果を表示する関数
const jankenHandler = (event) => {
  // プレイヤーの手の取得
  const player = Number(event.target.value)
  // 取得できているか、確認する。
  console.log(`player:   ${player}`)

  // 勝敗に応じ、メッセージ表示
  if (player === GUU) {
    // === は「厳密等価演算子」で、「等しい」ことを調べます。
    // プレイヤーがグーの時なら
    if (computer === GUU) {
      // コンピュータがグーを出した場合、
      alert("あいこです!")
    } else if (computer === CHOKI) {
      // コンピュータがチョキを出した場合
      alert("あなたの勝ちです!")
    } else {
      // コンピュータがパーを出した場合
      alert("あなたの負けです!")
    }
  } else if (player === CHOKI) {
    // プレイヤーがチョキの時に、
    if (computer === GUU) {
      // コンピュータがグーを出した場合
      alert("あなたの負けです!")
    } else if (computer === CHOKI) {
      // コンピュータがチョキを出した場合
      alert("あいこです!")
    } else {
      // コンピュータがパーを出した場合
      alert("あなたの勝ちです!")
    }
  } else {
    // プレイヤーがパーの時に、
    if (computer === GUU) {
      // コンピュータがグーを出した場合
      alert("あなたの勝ちです!")
    } else if (computer === CHOKI) {
      // コンピュータがチョキを出した場合
      alert("あなたの負けです!")
    } else {
      // コンピュータがパーを出した場合
      alert("あいこです!")
    }
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
