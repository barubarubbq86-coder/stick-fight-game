# Phase 6.1 Astra監査後・実行テスト一覧

## 完了結果

入力版：既存16ファイル成功。修正後：18ファイル成功、失敗0、skip0（271.345秒）。既に保存済みだった最終回帰結果を確認して採用し、成果物出力のためだけの再実行はしていません。以下の「1本」はNodeのテストファイル単位であり、内部assert数ではありません。

| ファイル | 主な確認範囲 | 最終結果 |
| --- | --- | --- |
| phase35-mix.mjs | 混成戦・旧戦闘比較 | 成功 |
| phase4-god.mjs | 神能力・介入 | 成功 |
| phase4-legacy-logic.mjs | 旧戦闘計算との回帰比較 | 成功 |
| phase4-mix-detail.mjs | 混成戦・戦果集計 | 成功 |
| phase45-input.mjs | 実ハンドラー入力・カメラ・配置操作 | 成功 |
| phase45-pwa.mjs | 参照・CSP・PWA構成・cache版 | 成功 |
| phase45-selection.mjs | 選択・複数選択・集団移動・回転・削除・Undo | 成功 |
| phase5-balance.mjs | Attack Challenge 75戦バランス | 成功 |
| phase5-challenge.mjs | Attack cost・固定敵・配置制約・保存・再試行 | 成功 |
| phase55-outcomes.mjs | 2／3／4陣営・TEAM倍率・戦闘結果 | 成功 |
| phase55-performance.mjs | 大人数・戦果・軽量化回帰 | 成功 |
| phase55-ui.mjs | モバイルUIハンドラー・各設定導線 | 成功 |
| phase6-defense.mjs | 13戦、Wave・旗・180秒勝利・敗北・編成復帰・モード保持 | 成功 |
| phase61-brush.mjs | ブラシ1／5／10、50／100／300体相当、正式／試験予算、Undo | 成功 |
| phase61-mass.mjs | 全槍24条件、フレームログ、pool・HP整合性 | 成功 |
| phase61-recovery.mjs | 旧版の停止再現、描画／遷移例外、モード復旧、TEAM削除 | 成功 |
| phase61-audit-combat.mjs | 新規：8発の段階的着弾・各1回解決、pool再利用、死体ガード等4項目 | 成功 |
| phase61-audit-state.mjs | 新規：同一モード、戻る失敗、部分追加rollback、削除／Undo／開始失敗の19項目 | 成功 |

Node入力テストのDOM/WebGLアダプターは本物のAndroidブラウザではありません。全ての上表操作をブラウザで手動確認したという意味ではありません。

## 未完了分として実施した最終ブラウザ確認

| スクリプト | 結果 |
| --- | --- |
| phase61-audit-browser.cjs | 最終版のみ18ブラシ条件成功。constructor計0回。50ms超longtask0。ネイティブCDPタッチ→開始→結果→再挑戦→編集、選択削除／TEAM削除／Undo、設定スクロール、2本指、描画例外復旧の4項目成功 |
| phase61-audit-browser-recovery.cjs | 同一モード3種、編成復帰constructor失敗、commit後DOM失敗の5項目成功。編成セットと例外注入のみtest-only APIを利用、モード選択は実UI。戻るエラーはDOM clickで誘発 |
| phase61-audit-offline.cjs | 実SWのphase61→audit1更新、通信遮断→reload→Defense進行、大量削除キャンセル、小画面の4項目成功 |
| phase61-audit-visual.cjs | Noto CJK導入後の370×506日本語レイアウトassert＋画像、370×740 Defense HUD＋旗の2項目成功 |

ブラウザ153.0.8010.0、SwiftShaderソフトウェア描画。PWAインストール・Android実機・物理タッチ・実機FPSは未検証。ブラシと他のブラウザテストは時間が一部重なるため、今回は旧版との速度比較をしていません。

## 証跡

- `test-results/phase61-audit-input-regression.log`：入力版16本。
- `test-results/phase61-audit-final-regression.log`：最終18本。ログのinjected errorは意図した例外試験で、末尾のpass18/fail0が結果。
- `phase61-audit-state-results.json`：19項目。
- `phase61-audit-combat-results.json`：4項目。
- `phase61-mass-results.json`：24条件と大量死亡フレーム詳細。
- `phase61-audit-browser-results.json`：スタンプ・refresh・DOM・constructor時間、longtask、生存配置数。
- `phase61-audit-browser-recovery-results.json`、`phase61-audit-offline-results.json`、`phase61-audit-visual-results.json`：ブラウザassert。
- `phase61-audit-small-screen-ja.png`、`phase61-audit-defense-ja.png`：最終日本語画像。
- `phase61-audit-recovery-screen.png`：復旧画面（この撮影時点では試験ホストに日本語フォントがなく、日本語は代替字形。文字内容はDOM検証）。
- `phase61-audit-source-manifest.json`、`phase61-audit-product.diff`：今回入力版とのバイト比較・差分。

## 再実行方法

Node.js 24系、展開したrootで：

```sh
node --experimental-vm-modules --test --test-concurrency=1 test-results/*.mjs
```

Playwright、Chromium（WebGL2）、Python3が必要な実ブラウザ試験：

```sh
node test-results/phase61-audit-browser.cjs
node test-results/phase61-audit-browser-recovery.cjs
node test-results/phase61-audit-offline.cjs
node test-results/phase61-audit-visual.cjs
```

必要ならCHROMIUM_EXECUTABLEにChromiumのパスを設定してください。日本語視覚試験にはホストに日本語フォントを導入してください。各スクリプトがlocalhost HTTPサーバーを起動します（8767／8768／8769）。同じポートを使うスクリプト同士は同時実行しないでください。性能を比較する場合は他の負荷と重ねないでください。

`baseline-phase61` は今回の入力成果物の実行資産、既存 `baseline-v13` はPhase 6比較元です。テスト内API公開や予算緩和はテストのみで、配布製品コードには入りません。元レポートに書かれた旧キャッシュ版のブラウザコマンドは履歴です。最終版には上記auditスクリプトを使用してください。
