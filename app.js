/**
 * Service Worker 登録スクリプト
 * PWA機能を有効化し、オフライン機能を提供します
 * 
 * 参考:
 * - https://jam25.jp/javascript/about-pwa/
 * - https://laboradian.com/create-offline-site-using-sw/
 * - https://developer.mozilla.org/ja/docs/Web/API/Service_Worker_API/Using_Service_Workers
 */

// サービスワーカーの登録を実行する関数
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('このブラウザはService Workerをサポートしていません');
    return;
  }

  try {
    console.log('Service Workerを登録中...');

    const registration = await navigator.serviceWorker.register('sw.js', {
      scope: '/', // スコープの指定（必要に応じて調整）
      updateViaCache: 'none' // 常に最新のService Workerを取得
    });

    // 登録成功時の処理
    if (registration.installing) {
      console.log('Service Worker インストール中');
    } else if (registration.waiting) {
      console.log('Service Worker インストール済み（待機中）');
    } else if (registration.active) {
      console.log('Service Worker アクティブ');
    }

    // 更新の検出
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        switch (newWorker.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              console.log('新しいコンテンツが利用可能です。更新するにはページをリロードしてください。');
              // ここで更新通知を表示するUIを表示することも可能
            } else {
              console.log('コンテンツがキャッシュされ、オフラインで利用可能になりました。');
            }
            break;
        }
      });
    });

  } catch (error) {
    console.error('Service Worker の登録に失敗しました:', error);
  }
};

// ページの読み込みが完了したらサービスワーカーを登録
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
  registerServiceWorker();
}

// ページがバックグラウンドから復帰した際の更新チェック
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
  }
});
