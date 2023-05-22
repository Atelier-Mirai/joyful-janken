// イベントリスナの設定
const playButton = document.getElementById("play")
playButton.addEventListener("click", jankenHandler)

// じゃんけんの勝ち負けの結果を表示する関数
function jankenHandler(event) {
  alert("あなたの勝ちです!")
}

// totalの初期値は0
let total = 0

// for文の実行の流れ
// まず、iを1で初期化
// iが10以下（条件式を満たす）ならfor文の処理を実行
// iを一つ増加させ(i++)、再び条件式の判定へ
for (let i = 1; i <= 10; i++) {
  // 1から10の値をtotalに加算している
  total = total + i
}

// コンソールに55が出力される
console.log(total)
