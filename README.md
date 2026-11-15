# 貯金ノート（iPhone向けPWA）

## 使い方
1. `index.html`、`app.js`、`manifest.webmanifest`、`sw.js`、`icon.png`、`icon-512.png` を同じ公開フォルダに配置する。
2. HTTPSで公開する（例：GitHub Pages）。`file://`で直接開くだけではPWAとして正常動作しない。
3. iPhoneのSafariで公開URLを開き、共有メニューから「ホーム画面に追加」を選ぶ。
4. ホーム画面の「貯金ノート」を起動して使用する。

## GitHub Pagesで無料公開
1. GitHubで新しいPublicリポジトリ `savings-note` を作成。
2. このフォルダの6ファイルをリポジトリのルートへアップロード。
3. Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save。
4. Pages画面に表示された公開URLをSafariで開く。

## 保存と注意点
- 支出・貯金の入力はlocalStorageに保存され、サーバーへ送信されない。
- 同じURLでもSafariとホーム画面アプリの保存領域が異なる場合がある。**実際に使うホーム画面アプリ内で記録**する。
- iPhoneの削除、Webサイトデータの消去、アプリの削除などで記録を失う可能性がある。JSONバックアップを定期的にファイルアプリへ保存する。
- iPhoneとMac間の同期は未実装。端末間共有には別途クラウド同期が必要。
- 週の支出は月曜〜日曜のうち平日（月〜金）の記録を集計する。土日の支出は履歴には残るが平日予算には含まれない。
- 毎週1,000円、毎月27日のへそくりは自動入金されない。実際に積み立てた時に入力する。
