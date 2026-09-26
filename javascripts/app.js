/* ============================================
   じゃんけんゲーム（本格版）
   ・コンピュータの手をシャッフルして、プレイヤーが手を選ぶ
   ・対戦成績を localStorage に保存する
   ・対戦成績を JSON ファイルへ書き出し、ファイルから読み込む
   ・Service Worker を登録して、オフラインでも遊べるようにする

   file:// で直接開いても遊べるよう、ES モジュールではなく
   通常のスクリプトとして書き、全体を即時関数で包んでいる。
   ============================================ */
(() => {
  'use strict';

  // JavaScript が動いたことを CSS に伝える（.no-js のときの表示を切り替える）
  document.documentElement.classList.remove('no-js');

  // ============================================
  // 定数
  // ============================================

  // じゃんけんの手。beats は「この手が勝てる相手」
  const HANDS = {
    guu:   { label: 'グー',   image: 'images/guu.webp',   beats: 'choki' },
    choki: { label: 'チョキ', image: 'images/choki.webp', beats: 'paa' },
    paa:   { label: 'パー',   image: 'images/paa.webp',   beats: 'guu' },
  };
  // ['guu', 'choki', 'paa']。ランダムに選ぶときや、読み込んだ値を確かめるときに使う
  const HAND_IDS = Object.keys(HANDS);

  // 勝敗の表示名。キーは 'win'（プレイヤーの勝ち）・'lose'・'draw'
  const RESULT_LABELS = { win: '勝ち', lose: '負け', draw: 'あいこ' };
  const RESULT_IDS = Object.keys(RESULT_LABELS);

  // 保存形式を変えたときに区別できるよう、キーに版を含める
  const RECORD_KEY   = 'joyful-janken-record-v1';
  const SETTINGS_KEY = 'joyful-janken-settings-v1';

  // 書き出すファイルの目印と形式の版
  const FILE_APP_NAME = 'joyful-janken';
  const FILE_VERSION  = 1;

  const HISTORY_LIMIT   = 100;      // 保存する対戦履歴の件数（合計数は別に数えるので、古い履歴を捨てても成績は減らない）
  const SHUFFLE_MS      = 250;      // シャッフル中に手を切り替える間隔（ミリ秒）
  const FILE_SIZE_LIMIT = 200_000;  // 読み込むファイルの上限（バイト）

  // ============================================
  // 勝敗判定
  // ============================================
  function judge(player, computer) {
    if (player === computer) {
      return 'draw';
    }
    return HANDS[player].beats === computer ? 'win' : 'lose';
  }

  // ============================================
  // localStorage の読み書き
  // 保存を拒否される環境（プライベートブラウズなど）でも、ゲームは止めない
  // localStorage は文字列しか保存できないので、JSON.stringify() で文字列にして保存し、
  // JSON.parse() でオブジェクトに戻す
  // ============================================
  const storage = {
    load(key) {
      try {
        const text = localStorage.getItem(key);
        return text === null ? null : JSON.parse(text);
      } catch (error) {
        console.warn(`${key} を読み込めませんでした`, error);
        return null;
      }
    },

    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn(`${key} を保存できませんでした`, error);
        return false;
      }
    },
  };

  // ============================================
  // 対戦成績
  // 合計（totals）と直近の履歴（history）を持つ。
  // 外から直接書き換えられないよう、中身は # で非公開にする。
  // ============================================
  class JankenRecord {
    // # で始まる名前は、クラスの外から読み書きできない（プライベートフィールド）
    #totals  = { win: 0, lose: 0, draw: 0 };
    #history = [];

    // 保存データやファイルの中身から作る。形式が正しくなければ null を返す。
    // static を付けたメソッドは、個々の成績からではなく JankenRecord.from(…) とクラスから呼ぶ。
    // 中身を確かめてから作る「入口」にして、壊れたデータを成績に持ち込まない
    static from(value) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return null;
      }

      const { totals, history } = value;
      const isCount = (n) => Number.isInteger(n) && n >= 0;
      if (!totals || !RESULT_IDS.every((id) => isCount(totals[id]))) {
        return null;
      }
      if (!Array.isArray(history) || !history.every(JankenRecord.#isValidEntry)) {
        return null;
      }

      // 履歴に含まれる勝敗の数が、合計を超えていたら矛盾している
      for (const id of RESULT_IDS) {
        if (history.filter((entry) => entry.result === id).length > totals[id]) {
          return null;
        }
      }

      // 同じクラスの中なので、作ったばかりの record の # にも書き込める
      const record = new JankenRecord();
      record.#totals  = { win: totals.win, lose: totals.lose, draw: totals.draw };
      // 余分なプロパティを持ち込まないよう、必要な項目だけを取り出す
      record.#history = history.slice(-HISTORY_LIMIT)
        .map(({ at, player, computer, result }) => ({ at, player, computer, result }));
      return record;
    }

    // 履歴 1 件分が正しいか確かめる。static かつ # なので、クラスの中からだけ呼べる。
    // 勝敗が手の組み合わせと合っているかも確かめ、書き換えられた成績を受け付けない
    static #isValidEntry(entry) {
      return entry !== null && typeof entry === 'object' &&
        HAND_IDS.includes(entry.player) &&
        HAND_IDS.includes(entry.computer) &&
        entry.result === judge(entry.player, entry.computer) &&
        typeof entry.at === 'string' && !Number.isNaN(Date.parse(entry.at));
    }

    // 1 回分の対戦を記録し、その記録を返す
    add(player, computer) {
      const entry = { at: new Date().toISOString(), player, computer, result: judge(player, computer) };
      this.#totals[entry.result]++;
      this.#history.push(entry);
      // 古い履歴から捨てて、保存量を一定に保つ
      if (this.#history.length > HISTORY_LIMIT) {
        this.#history.shift();
      }
      return entry;
    }

    // get を付けると、record.totals のように () を書かずに読める（ゲッター）。
    // 中身の写しを返すので、受け取った側が書き換えても元の成績は変わらない
    get totals() {
      return { ...this.#totals };
    }

    // 新しい順に並べた履歴。toReversed() は元の配列を変えずに、逆順の新しい配列を返す
    get recent() {
      return this.#history.toReversed();
    }

    get played() {
      return this.#totals.win + this.#totals.lose + this.#totals.draw;
    }

    // 勝率はあいこを除いて計算する。まだ勝敗がついていなければ null
    get winRate() {
      const decided = this.#totals.win + this.#totals.lose;
      return decided === 0 ? null : this.#totals.win / decided;
    }

    // 最新から数えた連勝数
    get streak() {
      let count = 0;
      for (let i = this.#history.length - 1; i >= 0 && this.#history[i].result === 'win'; i--) {
        count++;
      }
      return count;
    }

    // JSON.stringify(record) と書くと、このメソッドが自動で呼ばれ、戻り値が文字列になる。
    // localStorage への保存とファイルへの書き出しが、同じ形で済む
    toJSON() {
      return {
        app: FILE_APP_NAME,
        version: FILE_VERSION,
        savedAt: new Date().toISOString(),
        totals: this.totals,
        history: this.#history,
      };
    }
  }

  // ============================================
  // 音（BGM と効果音）
  // ============================================
  class SoundPlayer {
    #enabled = true;
    #bgm;
    #effects;

    constructor(enabled) {
      this.#enabled = enabled;
      this.#bgm = document.querySelector('[data-sound="bgm"]');
      this.#effects = Object.fromEntries(
        RESULT_IDS.map((id) => [id, document.querySelector(`[data-sound="${id}"]`)])
      );
      if (this.#bgm) {
        this.#bgm.volume = 0.4;
      }
    }

    get enabled() {
      return this.#enabled;
    }

    // set を付けると、sound.enabled = false のような代入で呼ばれる（セッター）。
    // OFF にしたら、その場で BGM も止める
    set enabled(value) {
      this.#enabled = Boolean(value);
      if (!this.#enabled) {
        this.#bgm?.pause();
      }
    }

    // ブラウザは利用者の操作がないと音を鳴らさないので、ボタンを押したときに呼ぶ
    startBgm() {
      if (!this.#enabled || !this.#bgm || !this.#bgm.paused) {
        return;
      }
      SoundPlayer.#play(this.#bgm);
    }

    playResult(result) {
      const sound = this.#effects[result];
      if (!this.#enabled || !sound) {
        return;
      }
      // 再生位置を先頭に戻し、続けて勝負したときも頭から鳴らす
      sound.currentTime = 0;
      SoundPlayer.#play(sound);
    }

    // play() は Promise を返し、自動再生の制限などで失敗すると reject される。
    // catch しておかないと、コンソールにエラーが残る
    static #play(audio) {
      audio.play().catch((error) => console.warn('音を再生できませんでした', error));
    }
  }

  // ============================================
  // 画面の部品
  // data-ui は表示する部品、data-action は操作する部品の目印。
  // 最初に 1 か所で探しておくと、HTML を変えたときに直す場所がすぐ分かる
  // ============================================
  const ui = {
    game:          document.querySelector('[data-ui="game"]'),
    computerHand:  document.querySelector('[data-ui="computer-hand"]'),
    message:       document.querySelector('[data-ui="message"]'),
    handButtons:   document.querySelectorAll('[data-hand]'),
    startButton:   document.querySelector('[data-action="start"]'),
    startLabel:    document.querySelector('[data-ui="start-label"]'),
    soundButton:   document.querySelector('[data-action="toggle-sound"]'),
    // 勝ち・負け・あいこの数を表示する部品を { win: …, lose: …, draw: … } の形にまとめる
    stats:         Object.fromEntries(
      RESULT_IDS.map((id) => [id, document.querySelector(`[data-ui="stat-${id}"]`)])
    ),
    // 狭い画面の対戦画面に出す、小さな集計
    miniStats:     Object.fromEntries(
      RESULT_IDS.map((id) => [id, document.querySelector(`[data-ui="mini-${id}"]`)])
    ),
    statRate:      document.querySelector('[data-ui="stat-rate"]'),
    summary:       document.querySelector('[data-ui="summary"]'),
    recordPanel:   document.querySelector('[data-ui="record"]'),
    openRecord:    document.querySelector('[data-action="open-record"]'),
    closeRecord:   document.querySelector('[data-action="close-record"]'),
    history:       document.querySelector('[data-ui="history"]'),
    historyCount:  document.querySelector('[data-ui="history-count"]'),
    historyEmpty:  document.querySelector('[data-ui="history-empty"]'),
    exportButton:  document.querySelector('[data-action="export"]'),
    importButton:  document.querySelector('[data-action="import"]'),
    importFile:    document.querySelector('[data-ui="import-file"]'),
    resetButton:   document.querySelector('[data-action="reset"]'),
    dataMessage:   document.querySelector('[data-ui="data-message"]'),
    confirm:       document.querySelector('[data-ui="confirm"]'),
    confirmTitle:  document.querySelector('[data-ui="confirm-title"]'),
    confirmText:   document.querySelector('[data-ui="confirm-text"]'),
    confirmOk:     document.querySelector('[data-ui="confirm-ok"]'),
    updateBar:     document.querySelector('[data-ui="update-bar"]'),
    updateButton:  document.querySelector('[data-action="apply-update"]'),
  };

  // 必要な部品が欠けていたら、途中で例外を出さずに止める
  if (!ui.game || !ui.computerHand || !ui.startButton) {
    return;
  }

  // ============================================
  // 状態（画面とは別のデータとして持つ）
  // ============================================
  // ?. は、左側が null や undefined のときにエラーにせず undefined を返す。
  // 保存がない初回は undefined !== false が true になり、音は ON で始まる
  const settings = { sound: storage.load(SETTINGS_KEY)?.sound !== false };
  // ?? は、左側が null や undefined のときだけ右側を使う。
  // 保存がない・壊れているときは、空の成績から始める
  let record = JankenRecord.from(storage.load(RECORD_KEY)) ?? new JankenRecord();
  const sound = new SoundPlayer(settings.sound);

  const game = {
    state: 'idle',         // 'idle'（開始前）・'playing'（シャッフル中）・'result'（結果表示中）
    computerHand: 'guu',
    lastResult: null,      // 直前の対戦記録
    frameId: 0,            // requestAnimationFrame の予約番号（止めるときに使う）
    lastTime: 0,           // 前回 shuffle が呼ばれた時刻（ミリ秒）
    elapsed: 0,            // 前回手を切り替えてからの経過時間
  };

  // Intl は、日付や数値を地域の書き方に整える標準の仕組み。
  // 「9/26 13:39」や「42.9%」の形にする
  const timeFormat = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const percentFormat = new Intl.NumberFormat('ja-JP', { style: 'percent', maximumFractionDigits: 1 });

  // ============================================
  // 描画：状態から画面を作る
  // ============================================
  // 状態を data-state・data-result として HTML に渡し、色や動きの切り替えは CSS に任せる
  function renderGame() {
    const { state, computerHand, lastResult } = game;
    ui.game.dataset.state = state;
    ui.game.dataset.result = state === 'result' ? lastResult.result : '';

    ui.computerHand.src = HANDS[computerHand].image;
    ui.computerHand.alt = state === 'playing' ? 'コンピュータの手：シャッフル中' : `コンピュータの手：${HANDS[computerHand].label}`;

    for (const button of ui.handButtons) {
      button.disabled = state !== 'playing';
      // toggle() の 2 つ目の値が true ならクラスを付け、false なら外す
      button.classList.toggle('is-chosen', state === 'result' && button.dataset.hand === lastResult.player);
    }

    ui.startButton.disabled = state === 'playing';
    ui.startLabel.textContent = state === 'idle' ? 'じゃんけんを はじめる' : 'もう一度あそぶ';

    ui.message.textContent = messageFor(game);
  }

  function messageFor({ state, lastResult }) {
    if (state === 'idle') {
      return '「じゃんけんを はじめる」を押してね';
    }
    if (state === 'playing') {
      return 'じゃんけん……　手を選んでね！';
    }

    const player   = HANDS[lastResult.player].label;
    const computer = HANDS[lastResult.computer].label;
    // 勝敗をキーにしたオブジェクトから選ぶと、switch 文より短く書ける
    return {
      win:  `あなたの勝ち！（${player} ＞ ${computer}）`,
      lose: `あなたの負け……（${player} ＜ ${computer}）`,
      draw: `あいこ！（${player} ＝ ${computer}）`,
    }[lastResult.result];
  }

  function renderRecord() {
    const totals = record.totals;
    for (const id of RESULT_IDS) {
      ui.stats[id].textContent = totals[id];
      ui.miniStats[id].textContent = totals[id];
    }

    const rate = record.winRate;
    ui.statRate.textContent = rate === null ? '―' : percentFormat.format(rate);

    const streak = record.streak;
    ui.summary.textContent = record.played === 0
      ? 'まだ対戦していません'
      : `全 ${record.played} 戦${streak >= 2 ? `・いま ${streak} 連勝中！` : ''}`;

    // 履歴は保存している分（最大 100 件）をすべて並べる。
    // 欄に収まらない分は CSS でスクロールさせる。毎回作り直しても 100 件なら十分速い
    const items = record.recent.map(createHistoryItem);
    // replaceChildren() は中身をまとめて入れ替える。... で配列を広げ、1 件ずつ渡す
    ui.history.replaceChildren(...items);
    ui.history.hidden = items.length === 0;
    ui.historyEmpty.hidden = items.length > 0;
    ui.historyCount.textContent = items.length > 0 ? `（${items.length} 件）` : '';
  }

  // 履歴の 1 行。文字は textContent で入れ、読み込んだデータが HTML として解釈されないようにする
  function createHistoryItem({ at, player, computer, result }) {
    const item = document.createElement('li');
    item.className = 'history-item';
    item.dataset.result = result;

    const time = document.createElement('time');
    time.className = 'history-time';
    time.dateTime = at;
    time.textContent = timeFormat.format(new Date(at));

    const hands = document.createElement('span');
    hands.className = 'history-hands';
    hands.textContent = `${HANDS[player].label} 対 ${HANDS[computer].label}`;

    const badge = document.createElement('span');
    badge.className = 'history-badge';
    badge.textContent = RESULT_LABELS[result];

    item.append(time, hands, badge);
    return item;
  }

  function renderSound() {
    ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));
  }

  function showDataMessage(text, tone = 'info') {
    ui.dataMessage.textContent = text;
    ui.dataMessage.dataset.tone = tone;
  }

  // ============================================
  // ゲームの進行
  // ============================================
  function startGame() {
    if (game.state === 'playing') {
      return;
    }

    game.state = 'playing';
    // requestAnimationFrame が渡す時刻と同じ基準で、いまの時刻を取っておく
    game.lastTime = performance.now();
    game.elapsed = 0;
    // requestAnimationFrame は、次に画面を描く直前に関数を 1 回呼ぶ。
    // shuffle の中でもう一度予約するので、止めるまで毎フレーム呼ばれ続ける
    game.frameId = requestAnimationFrame(shuffle);

    sound.startBgm();
    renderGame();
    // 開始ボタンは押せなくなるので、キーボード操作の人のためにフォーカスを手のボタンへ移す
    ui.handButtons[0]?.focus();
  }

  // 一定の間隔でコンピュータの手を切り替える。
  // 経過時間をためて判定するので、画面の更新頻度が違う端末でも速さが揃う。
  // （1 秒に 60 回描く画面でも 120 回描く画面でも、250 ミリ秒ごとに切り替わる）
  // time には、ページを開いてからの時刻（ミリ秒）が入る
  function shuffle(time) {
    if (game.state !== 'playing') {
      return;
    }

    game.elapsed += time - game.lastTime;
    game.lastTime = time;

    if (game.elapsed >= SHUFFLE_MS) {
      // 250 で割った余りを残し、次に切り替えるまでの時間がずれないようにする
      game.elapsed %= SHUFFLE_MS;
      // 毎回違う手にして、切り替わったことが見て分かるようにする
      const others = HAND_IDS.filter((id) => id !== game.computerHand);
      game.computerHand = others[Math.floor(Math.random() * others.length)];
      ui.computerHand.src = HANDS[game.computerHand].image;
    }

    // 次のフレームでも自分を呼ぶよう予約する
    game.frameId = requestAnimationFrame(shuffle);
  }

  function choose(player) {
    if (game.state !== 'playing' || !HANDS[player]) {
      return;
    }

    // 予約していた次の shuffle を取り消して、シャッフルを止める
    cancelAnimationFrame(game.frameId);
    // 表示中の手は見た目の演出なので、勝負の手は押した瞬間にあらためて決める
    game.computerHand = HAND_IDS[Math.floor(Math.random() * HAND_IDS.length)];
    game.lastResult = record.add(player, game.computerHand);
    game.state = 'result';

    storage.save(RECORD_KEY, record);
    sound.playResult(game.lastResult.result);
    renderGame();
    renderRecord();
    ui.startButton.focus();
  }

  // ============================================
  // 確認ダイアログ（押したボタンによって true / false を返す）
  // Promise を返すので、呼ぶ側は await confirmAction(…) と書けば、ボタンが押されるまで待てる
  // ============================================
  function confirmAction({ title, text, ok }) {
    // <dialog> に未対応の古いブラウザでは、標準の確認画面を使う
    if (typeof ui.confirm?.showModal !== 'function') {
      return Promise.resolve(window.confirm(text));
    }

    ui.confirmTitle.textContent = title;
    ui.confirmText.textContent = text;
    ui.confirmOk.textContent = ok;
    ui.confirm.returnValue = '';
    // showModal() は、後ろの画面を操作できない形で開く。Esc キーでも閉じられる
    ui.confirm.showModal();

    // method="dialog" のフォームでは、押したボタンの value（ok / cancel）が returnValue に入る。
    // { once: true } を付けると、1 回呼ばれたあと自動で登録が外れる
    return new Promise((resolve) => {
      ui.confirm.addEventListener('close', () => resolve(ui.confirm.returnValue === 'ok'), { once: true });
    });
  }

  // ============================================
  // 成績ファイルの書き出し・読み込み・リセット
  // ============================================
  function exportRecord() {
    // 3 つ目の 2 は字下げの幅。人が開いても読みやすい形で書き出す
    const json = JSON.stringify(record, null, 2);
    // Blob はファイルの中身になるデータのかたまり。createObjectURL() でそれを指す一時的な URL を作る
    const file = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(file);

    // download 属性の付いたリンクを押すと、ページを移動せずにこの名前で保存される。
    // 画面には置かず、click() で押したことにする
    const link = document.createElement('a');
    link.href = url;
    link.download = `janken-record-${dateStamp(new Date())}.json`;
    link.click();

    // ダウンロードが始まったあとで、一時 URL のメモリを解放する
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showDataMessage(`${link.download} を書き出しました（全 ${record.played} 戦）。`);
  }

  // 2026-09-26 の形（ファイル名用、利用者の地域の日付）
  function dateStamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // async を付けた関数の中では、await で時間のかかる処理の完了を待てる
  async function importRecord() {
    // 選ばれたファイルの 1 つ目。?.[0] で、選ばれていないときもエラーにしない
    const file = ui.importFile.files?.[0];
    // 同じファイルを選び直しても change が起きるよう、先に選択を空にする
    ui.importFile.value = '';
    if (!file) {
      return;
    }

    // 問題を見つけたら throw で下の catch へ飛び、理由を画面に出す
    try {
      // accept は選択画面の目安にすぎないので、大きさと中身を必ず確かめる
      if (file.size > FILE_SIZE_LIMIT) {
        throw new Error('ファイルが大きすぎます');
      }

      let data;
      try {
        // file.text() はファイルの中身を文字列として読む。時間がかかるので await で待つ
        data = JSON.parse(await file.text());
      } catch {
        throw new Error('JSON ファイルではありません');
      }
      if (data?.app !== FILE_APP_NAME) {
        throw new Error('じゃんけんゲームの成績ファイルではありません');
      }
      if (data.version !== FILE_VERSION) {
        throw new Error(`対応していない形式です（version: ${data.version}）`);
      }

      const imported = JankenRecord.from(data);
      if (!imported) {
        throw new Error('成績の内容に誤りがあります');
      }

      if (record.played > 0) {
        const ok = await confirmAction({
          title: '成績を読み込みますか？',
          text: `いまの成績（全 ${record.played} 戦）は、ファイルの成績（全 ${imported.played} 戦）に置き換わります。`,
          ok: '置き換える',
        });
        if (!ok) {
          showDataMessage('読み込みをやめました。');
          return;
        }
      }

      // 検証に通ったデータだけを反映して保存する
      record = imported;
      const saved = storage.save(RECORD_KEY, record);
      renderRecord();
      showDataMessage(saved
        ? `${file.name} を読み込みました（全 ${record.played} 戦）。`
        : `${file.name} を読み込みましたが、このブラウザには保存できませんでした。`,
      saved ? 'success' : 'warn');
    } catch (error) {
      showDataMessage(`読み込めませんでした：${error.message}`, 'error');
    }
  }

  async function resetRecord() {
    if (record.played === 0) {
      showDataMessage('リセットする成績はありません。');
      return;
    }

    const ok = await confirmAction({
      title: '成績をリセットしますか？',
      text: `全 ${record.played} 戦の成績と履歴を消します。残しておきたい場合は、先にファイルへ書き出してください。`,
      ok: 'リセットする',
    });
    if (!ok) {
      return;
    }

    record = new JankenRecord();
    storage.save(RECORD_KEY, record);
    renderRecord();
    showDataMessage('成績をリセットしました。', 'success');
  }

  // ============================================
  // 対戦成績のパネル（狭い画面だけ）
  // 広い画面では成績を横に並べるので、パネルとしては開かない
  // ============================================
  // matchMedia() は、CSS のメディアクエリと同じ条件を JavaScript から調べる。
  // style.css で成績を横に並べる条件（60rem 以上）と揃えておく
  const wideLayout = window.matchMedia('(width >= 60rem)');
  // パネルを開いている間、操作できないようにする後ろの部分
  const backgroundParts = document.querySelectorAll('.site-header, .game, .site-footer');

  function isRecordOpen() {
    return ui.recordPanel.classList.contains('is-open');
  }

  function openRecordPanel() {
    ui.recordPanel.classList.add('is-open');
    ui.openRecord.setAttribute('aria-expanded', 'true');
    // 後ろの部分に inert を付けると、クリックもフォーカスも届かなくなる
    for (const part of backgroundParts) {
      part.inert = true;
    }
    ui.closeRecord.focus();
  }

  function closeRecordPanel({ returnFocus = true } = {}) {
    if (!isRecordOpen()) {
      return;
    }
    ui.recordPanel.classList.remove('is-open');
    ui.openRecord.setAttribute('aria-expanded', 'false');
    for (const part of backgroundParts) {
      part.inert = false;
    }
    // 開いたボタンにフォーカスを戻し、キーボード操作の位置を見失わないようにする
    if (returnFocus) {
      ui.openRecord.focus();
    }
  }

  // ============================================
  // イベントをつなぐ
  // ============================================
  ui.startButton.addEventListener('click', startGame);

  for (const button of ui.handButtons) {
    button.addEventListener('click', () => choose(button.dataset.hand));
  }

  ui.soundButton.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    settings.sound = sound.enabled;
    storage.save(SETTINGS_KEY, settings);
    // ゲーム中に音を ON にしたら、その場で BGM を再開する
    if (game.state !== 'idle') {
      sound.startBgm();
    }
    renderSound();
  });

  ui.exportButton.addEventListener('click', exportRecord);
  ui.importButton.addEventListener('click', () => ui.importFile.click());
  ui.importFile.addEventListener('change', importRecord);
  ui.resetButton.addEventListener('click', resetRecord);

  ui.openRecord.addEventListener('click', openRecordPanel);
  ui.closeRecord.addEventListener('click', () => closeRecordPanel());

  // Esc キーで閉じる。確認ダイアログが開いているときは、先にダイアログだけを閉じる
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isRecordOpen() && !ui.confirm.open) {
      closeRecordPanel();
    }
  });

  // パネルの外（暗くなった部分）を押したら閉じる。
  // 開いたときのクリック自体と、確認ダイアログの中の操作は除く
  // contains() は、その要素の中（自分自身を含む）にあるかを調べる
  document.addEventListener('click', (event) => {
    const insidePanel = ui.recordPanel.contains(event.target) || ui.openRecord.contains(event.target);
    if (!isRecordOpen() || insidePanel || event.target.closest('dialog')) {
      return;
    }
    closeRecordPanel();
  });

  // 画面を広げて成績が横に並んだら、開いていたパネルの状態を片付ける
  wideLayout.addEventListener('change', () => {
    if (wideLayout.matches) {
      closeRecordPanel({ returnFocus: false });
    }
  });

  // 別のタブで成績が変わったら、この画面にも反映する。
  // storage イベントは、同じサイトの別のタブで localStorage が変わったときに届く（変えたタブ自身には届かない）
  window.addEventListener('storage', (event) => {
    if (event.key !== RECORD_KEY) {
      return;
    }
    record = JankenRecord.from(storage.load(RECORD_KEY)) ?? new JankenRecord();
    renderRecord();
  });

  // 最初の表示も同じ描画関数で作り、データと画面を揃える
  renderGame();
  renderRecord();
  renderSound();

  // ============================================
  // Service Worker（PWA・オフライン対応）
  // file:// では登録できないので、http(s) で開いたときだけ登録する
  // ============================================
  // registerServiceWorker は下で function 宣言しているので、定義より前のここから呼べる（巻き上げ）
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    registerServiceWorker();
  }

  // 新しい版に更新する流れ
  // 1. sw.js が変わっていると、ブラウザが新しい版をインストールする（updatefound）
  // 2. インストールが終わっても、古い版が動いている間は待機する（waiting）
  // 3. 「更新する」が押されたら、新しい版に SKIP_WAITING を送り、すぐに切り替えてもらう
  // 4. 切り替わると controllerchange が起きるので、ページを読み直して新しいファイルで表示する
  async function registerServiceWorker() {
    try {
      // 前の版がすでに動いていたか。初回のインストールでは更新の案内も再読み込みもしない
      const hadController = Boolean(navigator.serviceWorker.controller);
      const registration = await navigator.serviceWorker.register('./sw.js');
      let waitingWorker = null;

      const offerUpdate = (worker) => {
        if (!hadController) {
          return;
        }
        waitingWorker = worker;
        ui.updateBar.hidden = false;
      };

      // 「更新する」で待機中の新しい版に切り替えてもらう。
      // postMessage() で送った合図は、sw.js の message イベントで受け取る
      ui.updateButton.addEventListener('click', () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
      });

      if (registration.waiting) {
        offerUpdate(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            offerUpdate(worker);
          }
        });
      });

      // 新しい版に切り替わったら、一度だけ再読み込みして新しいファイルで表示する
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) {
          return;
        }
        reloading = true;
        location.reload();
      });
    } catch (error) {
      console.warn('Service Worker を登録できませんでした', error);
    }
  }
})();
