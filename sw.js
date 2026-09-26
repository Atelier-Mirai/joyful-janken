/* ============================================
   Service Worker — オフラインでも遊べるよう、必要なファイルをキャッシュから返す

   Service Worker は、ページとネットワークの間に立つ別のスクリプト。
   ページとは別に動くので、document や画面の部品には触れない。
   次の 3 つの段階で働く。
   1. install  … 初めて登録されたとき（と sw.js が変わったとき）に、ファイルをキャッシュへ揃える
   2. activate … 新しい版が働き始めるときに、古い版のキャッシュを片付ける
   3. fetch    … ページが画像や CSS などを求めるたびに呼ばれ、キャッシュから返す

   キャッシュを優先して返すので、ファイルを直しても古いものが表示され続ける。
   公開するファイルを変えたら、CACHE_NAME の版（v3 → v4）を必ず上げる。
   版が変わると sw.js の中身が変わったとみなされ、新しい版のインストールが始まる。
   ============================================ */
const CACHE_PREFIX = 'joyful-janken-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;

// 初回に揃えるファイル。存在しないファイルがあるとキャッシュの作成に失敗するので、実在するものだけを書く
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './stylesheets/style.css',
  './javascripts/app.js',
  './images/guu.webp',
  './images/choki.webp',
  './images/paa.webp',
  './images/favicon.ico',
  './images/apple-touch-icon-180x180.png',
  './images/icon-192x192.png',
  './images/icon-512x512.png',
  './sounds/bgm.mp3',
  './sounds/win.mp3',
  './sounds/lose.mp3',
  './sounds/draw.mp3',
  // シンプル版もオフラインで開けるようにしておく
  './simple-index.html',
  './stylesheets/simple.css',
  './javascripts/simple.js',
];

// ---- インストール：オフライン用のファイルを揃える ----
// self は Service Worker 自身を指す（ページの window にあたる）。
// waitUntil() に Promise を渡すと、それが終わるまでインストールを完了扱いにしない
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
});

// ---- 有効化：古い版のキャッシュを片付ける ----
// このアプリのキャッシュ（joyful-janken- で始まる名前）のうち、いまの版以外を消す
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    ))
  );
});

// ---- ページの「更新する」ボタンから届いたら、待たずに新しい版へ切り替える ----
// 新しい版は、古い版で開いているページがすべて閉じられるまで待機するのが決まり。
// skipWaiting() を呼ぶと、待たずに切り替わる
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---- 取得：同じサイトの GET だけを、キャッシュ優先で返す ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 読み込み（GET）以外や、ほかのサイトへの要求には手を出さず、いつもどおりネットワークに任せる
  if (request.method !== 'GET') {
    return;
  }
  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // respondWith() に渡した Promise の結果が、ページへの返事になる
  event.respondWith(respond(request));
});

// キャッシュにあればそれを返し、なければネットワークから取ってくる（キャッシュ優先）
async function respond(request) {
  const cache = await caches.open(CACHE_NAME);
  // ?utm=… などの付いたページ遷移でも、同じ HTML を返せるようにする
  const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });

  if (cached) {
    // 音声は Safari などが「一部だけ（Range）」を求めてくるので、該当部分を切り出して返す
    return request.headers.has('range') ? partialResponse(request, cached) : cached;
  }

  try {
    return await fetch(request);
  } catch (error) {
    // オフラインでキャッシュにもないページは、トップページで代用する
    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }
}

// 音声や動画を再生するとき、ブラウザは「Range: bytes=100-199」のように必要な部分だけを求めることがある。
// Safari はこの求めに部分（206）で答えないと再生しないので、キャッシュしたファイル全体から切り出して返す
async function partialResponse(request, response) {
  // ファイル全体をバイト列として読み出す
  const buffer = await response.arrayBuffer();
  const size = buffer.byteLength;
  // 「bytes=100-199」から始まり（100）と終わり（199）を取り出す。どちらも省略されることがある
  const [, startText = '', endText = ''] = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range')) ?? [];

  // 「bytes=-500」（末尾 500 バイト）の形にも対応する
  let start = startText === '' ? size - Number(endText) : Number(startText);
  let end = startText !== '' && endText !== '' ? Number(endText) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);

  // 範囲がおかしいときは「その範囲は返せない（416）」と答える
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }

  // 206 は「一部だけを返した」という意味。どこからどこまでかを Content-Range で伝える
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}
