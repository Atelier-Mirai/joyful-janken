// 定数宣言
// プログラム内で共通して使う定数を宣言する。
const GUU   = 0 // グー
const CHOKI = 1 // チョキ
const PAA   = 2 // パー

// computer の手を設定(仮)
let computer = GUU

// じゃんけんの勝ち負けの結果を表示する関数
const jankenHandler = (event) => {
  // プレイヤーの手の取得
  const player = Number(event.target.value)
  // 取得できているか、確認する。
  console.log(player)

  // 勝敗に応じ、メッセージ表示
  // === は「厳密等価演算子」で、「等しい」ことを調べます。
  if (player === GUU) {
    // プレイヤーがグーの時に行う処理を記します。
    // ここでは、alert文を使い、画面表示します。
    alert("あいこです!")
  } else if (player === CHOKI) {
    // プレイヤーがチョキの時の処理を記します。
    alert("あなたの負けです!")
  } else {
    // プレイヤーがパーの時の処理を記します。
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
