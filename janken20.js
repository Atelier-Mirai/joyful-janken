// イベントリスナの設定
const playButton = document.getElementById("play")
playButton.addEventListener("click", jankenHandler)

// じゃんけんの勝ち負けの結果を表示する関数
function jankenHandler(event) {
  for(let i = 0; i < 3; i++) {
    alert("あなたの勝ちです!")
  }
}
