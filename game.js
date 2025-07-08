// ============================================
// 定数宣言
// ============================================

// ゲームの状態を表す定数
// - IDLE: 待機中（ゲーム開始前）
// - PLAYING: プレイ中
// - RESULT: 結果表示中
const GAME_STATE = {
  IDLE:    'idle',
  PLAYING: 'playing',
  RESULT:  'result'
};

// じゃんけんの手の種類を表す定数
// 0: グー, 1: チョキ, 2: パー
const HAND_TYPES = {
  ROCK:     0,
  SCISSORS: 1,
  PAPER:    2
};

// 勝敗結果を表す定数
// 0: あいこ, 1: 負け, 2: 勝ち
const RESULT_TYPES = {
  DRAW:   0,
  LOSE:   1,
  WIN:    2
};

// ============================================
// ゲームのメインクラス
// じゃんけんゲームのロジックと状態を管理します
// ============================================
class JankenGame {
  // ============================================
  // コンストラクタ
  // じゃんけんゲームの新しいインスタンスを作成する際に自動的に呼び出されます。
  // ゲームを始めるための準備（オーディオ要素の取得や初期設定）を行います。
  // 例：新しいゲームを始めるときに必要な部品を用意する場所、と考えると分かりやすいです。
  // ============================================
  constructor() {
    // オーディオ要素の取得
    this.bgm       = document.getElementById('bgm');
    this.winSound  = document.getElementById('winSound');
    this.loseSound = document.getElementById('loseSound');
    this.drawSound = document.getElementById('drawSound');
    
    // BGMの初期化と制御
    this.initBGM();
    
    // ユーザーインタラクションがないと音が再生されない問題を回避するためのイベントリスナー
    this.setupAudioInteractions();
    
    // ゲームの初期化
    this.init();
  }

  // ============================================
  // オーディオ再生のためのユーザーインタラクション設定
  // ============================================
  setupAudioInteractions() {
    // ユーザーが初めてページを操作したときにオーディオを有効化
    const enableAudio = () => {
      // オーディオコンテキストを再開（モバイル対応）
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // BGMを再生
      this.playBgm();
      
      // 一度実行したらイベントリスナーを削除
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
    
    // オーディオコンテキストの作成（クロスブラウザ対応）
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    
    // クリックまたはキーダウンでオーディオを有効化
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
  }
  
  // ============================================
  // ゲームの初期化
  // ============================================
  init() {
    // ゲームの初期状態を設定
    this.state        = GAME_STATE.IDLE;      // ゲームの状態（初期状態は待機中）
    this.computerHand = HAND_TYPES.ROCK;      // コンピュータの手（初期値はグー）
    this.scores       = { win: 0, lose: 0 };  // 勝敗のスコア
    
    // アニメーション制御用の変数
    this.animationFrameId = null;  // アニメーションフレームのID
    this.animationSpeed   = 4;     // 1秒あたりのアニメーションコマ数
    this.lastUpdateTime   = 0;     // 前回のアニメーション更新時刻
    this.accumulator      = 0;     // アニメーションの進行を管理する時間の蓄積値（ミリ秒）
                                   // accumulatorは、フレームレートの変動を吸収し、アニメーションの速度を一定に保つために使用
    // 前回のフレームからの経過時間を加算していき、一定の間隔で手の更新を行う
    
    // ============================================
    // DOM要素の取得
    // ============================================
    this.handImage     = document.getElementById('hand');            // コンピュータの手の画像要素
    this.resultMessage = document.getElementById('result-message');  // 結果メッセージ表示要素
    this.winScore      = document.getElementById('win');             // 勝利数表示要素
    this.loseScore     = document.getElementById('lose');            // 敗北数表示要素
    this.playButton    = document.getElementById('play');            // スタートボタン要素
    this.handContainer = document.querySelector('.hand-container');  // 手のアニメーション用コンテナ
    
    // ============================================
    // イベントリスナーの設定
    // ============================================
    // 各ボタンにクリックイベントを設定
    // ゲームの状態に応じて適切な処理を実行
    this.bindEvents();
    
    // 初期化
    this.updateScores();
    this.setHandImage(HAND_TYPES.ROCK);
  }
  
  // ============================================
  // イベントリスナーの設定
  // ============================================
  bindEvents() {
    // グーボタンがクリックされた時のイベントリスナー
    // プレイヤーがグーを選択したことを処理する
    document.getElementById('guu').addEventListener('click', () => this.handlePlayerChoice(HAND_TYPES.ROCK));
    
    // チョキボタンがクリックされた時のイベントリスナー
    // プレイヤーがチョキを選択したことを処理する
    document.getElementById('choki').addEventListener('click', () => this.handlePlayerChoice(HAND_TYPES.SCISSORS));
    
    // パーボタンがクリックされた時のイベントリスナー
    // プレイヤーがパーを選択したことを処理する
    document.getElementById('paa').addEventListener('click', () => this.handlePlayerChoice(HAND_TYPES.PAPER));
    
    // スタート/リトライボタンがクリックされた時のイベントリスナー
    // ゲームの開始または再開を処理する
    this.playButton.addEventListener('click', () => this.startGame());
  }
  
  // ============================================
  // ゲームの開始
  // コンピュータの手のアニメーションを開始し、ゲーム状態を更新
  // ============================================
  startGame() {
    // 既にプレイ中の場合は処理を中断
    if (this.state === GAME_STATE.PLAYING) return;
    
    // ゲーム状態を「プレイ中」に更新
    this.state = GAME_STATE.PLAYING;
    
    // BGMを再生
    this.playBgm();
    
    // ユーザーに現在の状態を通知
    this.resultMessage.innerHTML = `<p>コンピュータの手を選んでいます...</p>`;
    
    // スタートボタンを無効化（連続クリック防止）
    this.playButton.disabled = true;
    
    // 手のアニメーションを開始
    this.handContainer.classList.add('shaking');  // 揺れアニメーションを適用
    
    // アニメーションの基準時刻を現在時刻に設定
    this.lastUpdateTime = performance.now();
    
    // アニメーションフレームを開始し、animateメソッドをコールバックとして登録
    this.animationFrameId 
      = requestAnimationFrame((timestamp) => this.animate(timestamp));
  }
  
  // ============================================
  // アニメーションの更新
  // タイムスタンプに基づいてコンピュータの手をアニメーション表示
  // @param {number} timestamp - アニメーションのタイムスタンプ
  // ============================================
  animate(timestamp) {
    // ゲームがプレイ中でない場合はアニメーションを停止
    if (this.state !== GAME_STATE.PLAYING) return;
    
    // 前回のフレームからの経過時間を計算
    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;  // 最終更新時刻を更新
    
    // アニメーションの更新処理
    // アキュムレータに経過時間を加算（フレームレートの変動を吸収）
    this.accumulator += deltaTime;
    
    // 1フレームあたりの表示時間（ミリ秒）を計算
    // 例: 1秒に4回更新する場合、250msごとに手を切り替え
    const frameInterval = 1000 / this.animationSpeed;
    
    // 蓄積した時間が1フレーム分を超えている間、手を更新
    // これにより、フレームレートが低下してもアニメーション速度が一定に保たれる
    while (this.accumulator >= frameInterval) {
      this.updateHand();  // コンピュータの手を更新
      this.accumulator -= frameInterval;  // 処理済みの時間を減算
    }
    
    // 次のアニメーションフレームをリクエスト
    this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
  }
  
  // ============================================
  // コンピュータの手を更新
  // ランダムな手を選択し、画像を更新
  // ============================================
  updateHand() {
    // ランダムな手を選ぶ
    const hands = [HAND_TYPES.ROCK, HAND_TYPES.SCISSORS, HAND_TYPES.PAPER];
    const randomIndex = Math.floor(Math.random() * hands.length);
    this.computerHand = hands[randomIndex];
    this.setHandImage(this.computerHand);
  }
  
  // ============================================
  // プレイヤーの選択
  // @param {number} playerHand - プレイヤーの手（HAND_TYPESの値）
  // ============================================
  handlePlayerChoice(playerHand) {
    // ゲームがプレイ中でない場合は処理を中断
    if (this.state !== GAME_STATE.PLAYING) return;
    
    // アニメーションの停止処理
    // 進行中のアニメーションフレームをキャンセルし、揺れアニメーションを削除
    cancelAnimationFrame(this.animationFrameId);
    this.handContainer.classList.remove('shaking');
    
    // 勝敗判定の実行
    // プレイヤーの手とコンピュータの手を比較して結果を取得
    const result = this.judge(playerHand, this.computerHand);
    
    // 結果を画面に表示
    this.showResult(result, playerHand, this.computerHand);
    
    // スコアの更新処理
    // 勝敗に応じてスコアを加算
    if (result === RESULT_TYPES.WIN) {
      this.scores.win++;  // 勝利数を1増やす
    } else if (result === RESULT_TYPES.LOSE) {
      this.scores.lose++; // 敗北数を1増やす
    }
    
    // 画面のスコア表示を更新
    this.updateScores();
    
    // ゲーム状態を「結果表示中」に変更
    this.state = GAME_STATE.RESULT;
    
    // UIの更新
    this.playButton.disabled = false;  // ボタンを有効化
    this.playButton.innerHTML = '<i class="fas fa-redo"></i><span>もう一度遊ぶ</span>';  // ボタンのテキストを変更
  }
  
  // ============================================
  // 勝敗判定
  // @param {number} playerHand - プレイヤーの手（HAND_TYPESの値）
  // @returns {number} 勝敗結果（RESULT_TYPESの値）
  // ============================================
  judge(player, computer) {
    // 勝敗判定のアルゴリズム
    // 手の値を数値（0:グー, 1:チョキ, 2:パー）として扱い、以下の計算で勝敗を判定
    // 
    // 計算式: (player - computer + 3) % 3 の結果で判定
    // - 1: プレイヤーの負け
    // - 2: プレイヤーの勝ち
    // - 0: あいこ
    // 
    // 計算例:
    // 1. プレイヤー: チョキ(1) vs コンピュータ: グー(0)
    //    (1 - 0 + 3) % 3 = 1 → 負け
    // 2. プレイヤー: チョキ(1) vs コンピュータ: パー(2)
    //    (1 - 2 + 3) % 3 = 2 → 勝ち
    // 3. プレイヤー: チョキ(1) vs コンピュータ: チョキ(1)
    //    (1 - 1 + 3) % 3 = 0 → あいこ
    
    // 計算結果を1回だけ行い、その結果で分岐
    const result = (player - computer + 3) % 3;
    
    switch (result) {
      case 1:
        return RESULT_TYPES.LOSE;  // 負け
      case 2:
        return RESULT_TYPES.WIN;   // 勝ち
      case 0:
      default:
        return RESULT_TYPES.DRAW;  // あいこ
    }
  }
  
  // ============================================
  // 結果を表示
  // @param {number} result - 勝敗結果（RESULT_TYPESの値）
  // ============================================
  showResult(result, playerHand, computerHand) {
    // 手の数値（0,1,2）を日本語の手の名前に変換するための配列
    const handNames = ['グー', 'チョキ', 'パー'];
    
    // プレイヤーとコンピュータの手を日本語に変換
    const playerHandName   = handNames[playerHand];
    const computerHandName = handNames[computerHand];
    
    // メッセージとスタイル用のクラス名を格納する変数
    let message, className;
    
    // 勝敗結果に応じたメッセージとスタイルを設定
    switch (result) {
      case RESULT_TYPES.WIN:
        // プレイヤーの勝ちの場合
        message = `あなたの勝ち！ (${playerHandName} ＞ ${computerHandName})`;
        className = 'win';  // 勝利時のスタイルクラス
        break;
        
      case RESULT_TYPES.LOSE:
        // プレイヤーの負けの場合
        message = `あなたの負け (${playerHandName} ＜ ${computerHandName})`;
        className = 'lose';  // 敗北時のスタイルクラス
        break;
        
      default:
        // あいこの場合（上記以外の全ての場合）
        message = `あいこ！ (${playerHandName} ＝ ${computerHandName})`;
        className = 'draw';  // 引き分け時のスタイルクラス
        break;
    }
    
    // 結果メッセージをHTMLに反映
    this.resultMessage.innerHTML = `<p>${message}</p>`;
    
    // 結果に応じたスタイルクラスを適用
    this.resultMessage.className = `result-message ${className}`;

    // 結果に応じた効果音を再生
    this.playResultSound(result);
  }
  
  // ============================================
  // 手の画像を更新
  // @param {number} hand - 表示する手の種類（HAND_TYPESの値）
  // ============================================
  setHandImage(handType) {
    // 手の種類に対応する画像ファイルのパスを定義
    // インデックスは HAND_TYPES の値（0: グー, 1: チョキ, 2: パー）に対応
    const images = [
      'images/guu.webp',    // グーの画像
      'images/choki.webp',  // チョキの画像
      'images/paa.webp'     // パーの画像
    ];
    
    // 手の種類に応じた画像を設定
    this.handImage.src = images[handType];
    
    // アクセシビリティのための代替テキストを設定
    // 画像が表示されない場合やスクリーンリーダーで読み上げる際に使用される
    this.handImage.alt = ['グー', 'チョキ', 'パー'][handType];
  }
  
  // ============================================
  // スコアを更新
  // 画面上のスコア表示を最新の状態に更新
  // ============================================
  updateScores() {
    // 画面上の勝利数・敗北数を更新
    this.winScore.textContent = this.scores.win;    // 勝利数を表示
    this.loseScore.textContent = this.scores.lose;  // 敗北数を表示
    
    // スコアをローカルストレージに保存
    // ブラウザを閉じてもスコアが保持されるようにする
    localStorage.setItem('jankenScores', JSON.stringify(this.scores));
  }
  
  // ============================================
  // BGMの初期化と制御
  // ============================================
  initBGM() {
    this.bgm = document.getElementById('bgm');
    this.bgmToggle = document.getElementById('bgmToggle');
    this.isSoundEnabled = true; // BGMと効果音の両方を制御するフラグ

    // ローカルストレージから設定を読み込む
    const savedSoundState = localStorage.getItem('soundEnabled');
    if (savedSoundState !== null) {
      this.isSoundEnabled = savedSoundState === 'true';
      this.updateBGMState();
    }

    // ボタンクリックイベント
    this.bgmToggle.addEventListener('click', () => {
      this.isSoundEnabled = !this.isSoundEnabled;
      this.updateBGMState();
      localStorage.setItem('soundEnabled', this.isSoundEnabled);
    });

    // ユーザーインタラクションでBGMを再生
    document.addEventListener('click', this.handleFirstInteraction.bind(this), { once: true });
  }

  // ============================================
  // 初回のユーザーインタラクションでBGMを再生
  // ============================================
  handleFirstInteraction() {
    if (this.isSoundEnabled) {
      const playPromise = this.bgm.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('BGM再生に失敗しました:', error);
        });
      }
    }
  }

  // ============================================
  // サウンドの状態を更新
  // ============================================
  updateBGMState() {
    if (this.isSoundEnabled) {
      // BGMの再生
      this.bgm.volume = 0.5;
      this.bgm.loop   = true;
      this.bgmToggle.classList.remove('muted');
      this.bgmToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
      this.bgm.play().catch(e => console.log('BGM再生エラー:', e));
    } else {
      // BGMの停止
      this.bgm.pause();
      this.bgmToggle.classList.add('muted');
      this.bgmToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
  }

  // ============================================
  // 効果音を再生
  // ============================================
  playSound(sound) {
    if (!this.isSoundEnabled) return; // サウンドが無効な場合は再生しない

    sound.currentTime = 0; // 再生位置を先頭に戻す
    sound.play().catch(e => console.log('効果音再生エラー:', e));
  }

  // ============================================
  // 結果に応じた効果音を再生
  // ============================================
  playResultSound(result) {
    if (!this.isSoundEnabled) return; // サウンドが無効な場合は再生しない

    switch (result) {
      case RESULT_TYPES.WIN:
        this.playSound(this.winSound);
        break;
      case RESULT_TYPES.LOSE:
        this.playSound(this.loseSound);
        break;
      default:
        this.playSound(this.drawSound);
    }
  }

  // ============================================
  // BGMを再生
  // ============================================
  playBgm() {
    if (!this.isSoundEnabled) return; // サウンドが無効な場合は再生しない

    const playPromise = this.bgm.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log('BGM再生に失敗しました:', error);
      });
    }
  }
  // ============================================
  // 初回のユーザーインタラクションでBGMを再生
  // ============================================
  handleFirstInteraction() {
    if (this.isBGMEnabled) {
      const playPromise = this.bgm.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('BGM再生に失敗しました:', error);
        });
      }
    }
  }

  // ============================================
  // スコアを読み込み
  // ローカルストレージから前回のスコアを読み込む
  // ============================================
  loadScores() {
    // ローカルストレージから保存済みのスコアを取得
    const savedScores = localStorage.getItem('jankenScores');
    
    // 保存されたスコアが存在する場合
    if (savedScores) {
      // JSON文字列をオブジェクトに変換してスコアを復元
      this.scores = JSON.parse(savedScores);
      
      // 画面上のスコア表示を更新
      this.updateScores();
    }
    // 保存されたスコアが存在しない場合は、デフォルト値（0,0）のまま
  }
}

// ============================================
// ゲームの初期化
// DOMの読み込み完了後に実行される
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // JankenGameクラスのインスタンスを作成
  // これにより、ゲームの状態管理やイベントリスナーが初期化される
  const game = new JankenGame();
  
  // ローカルストレージから前回のスコアを読み込み
  // 初回起動時やスコアが保存されていない場合はデフォルト値（0,0）が使用される
  game.loadScores();
});
