# Phase 6.2 実行テスト一覧

## Node回帰

18ファイル成功・失敗0・skip0。最終製品JSで実行。実行途中の最後のCSS／viewportメタ修正は、その後の実ブラウザと実PWA試験で検証しています。異常系ログのinjected errorは意図した例外です。

- `phase35-mix.mjs`：成功
- `phase4-god.mjs`：成功
- `phase4-legacy-logic.mjs`：成功
- `phase4-mix-detail.mjs`：成功
- `phase45-input.mjs`：成功
- `phase45-pwa.mjs`：成功
- `phase45-selection.mjs`：成功
- `phase5-balance.mjs`：成功
- `phase5-challenge.mjs`：成功
- `phase55-outcomes.mjs`：成功
- `phase55-performance.mjs`：成功
- `phase55-ui.mjs`：成功
- `phase6-defense.mjs`：成功
- `phase61-audit-combat.mjs`：成功
- `phase61-audit-state.mjs`：成功
- `phase61-brush.mjs`：成功
- `phase61-mass.mjs`：成功
- `phase61-recovery.mjs`：成功

## 新規実ブラウザ

- `phase62-browser.cjs`：8項目成功。360／370／390px、選択・移動切替・回転・削除・Undo、観戦・停止、神の初回説明、Defense実タッチ合成ブラシ、旗／Wave／時間、0体案内、低い画面の入力・保存、Attackラベル。
- `phase62-offline.cjs`：4項目成功。audit1→phase62の実Service Worker更新、通信遮断・再読込・Defense進行、大量削除キャンセル、370×506レイアウト。

キーボード相当の最初の試験ではfocus変化による保存タップ失敗を検出し、CSS修正後に上記8項目を再実行して成功しました。テスト開始時には実行環境のChromiumバイナリが不完全で起動しなかったため、同じバージョンを再展開しました。これは製品の不具合ではありません。

## 証跡（ZIPのtest-results内）

- `phase62-regression.log`：18本の結果。
- `phase62-browser.log`／`phase62-browser-results.json`：最終UI試験。
- `phase62-offline.log`／`phase62-offline-results.json`：実PWA試験。
- `phase62-sandbox-360x740.png`、`phase62-sandbox-370x506.png`、`phase62-sandbox-390x844.png`：選択バー。
- `phase62-defense-370x506.png`：戦闘HUD。
- `phase62-placement-sheet.png`：ブラシ設定シート。
- `phase62-keyboard-resize.png`：370×300の入力欄。
- `phase62-spectator.png`：Sandbox観戦。
- 各既存テストの結果JSONも今回の実行結果へ更新。

## 再実行

展開rootでNode24系を使用：

```sh
node --experimental-vm-modules --test --test-concurrency=1 test-results/*.mjs
```

ブラウザはPlaywright、Chromium（WebGL2）が必要です：

```sh
node test-results/phase62-browser.cjs
node test-results/phase62-offline.cjs
```

任意のChromiumを使用する場合はCHROMIUM_EXECUTABLEを指定。日本語視覚確認にはホストの日本語フォントが必要です。localhostサーバーを8769／8768番で起動します。SW比較用のaudit1実行資産はbaseline-audit1に同梱しています。旧フェーズのブラウザスクリプトは当時のUI／cache期待値なので、最終UIには上記のphase62スクリプトを使ってください。

Android実機、実ソフトキーボード、物理タッチ、PWA実インストールは未確認です。
