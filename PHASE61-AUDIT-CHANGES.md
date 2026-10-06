# Phase 6.1 Astra監査後の変更点

比較元：今回添付されたPhase 6.1 stability ZIP。最終版：phase61-audit1。

| ファイル | 変更理由・内容 |
| --- | --- |
| game-v13.js | 同一モード再選択時に現行editorを維持。openEditorのBattle生成・検証をcommit前へ移動。表示更新・開始・モード切替の例外を見える復旧案内へ統一し、不整合な戦場を停止・非表示。ブラシの部分追加失敗時に配置・ID・完全なUndo履歴・セッションをrollback |
| index.html | モード選択内にrole=alertのmodeErrorを追加 |
| sw.js | キャッシュ名をphase61-audit1へ更新。旧コードと新HTMLの混在を防止 |
| README.md | 最新監査レポートへの案内 |
| test-results/phase45-pwa.mjs | 最終キャッシュバージョンの期待値更新 |
| test-results/phase61-audit-* | 独立戦闘・状態・ブラウザ・更新オフライン・日本語視覚テストと証跡、入力版とのハッシュ／製品差分を追加 |

`data.js`、`simulation.js`、`editor.js`、`placement.js`、`rules.js`、DefenseRuntime、Challenge定義、CSSなど、上記3製品ファイル以外の実行資産は入力版と同一です。既存の削除・Undo・cost・配置制約を再利用し、正常ブラシはBattle再生成0回を維持しました。

削除／Undoが成功した後に表示だけ失敗した場合は、成功した配置変更を保持して表示を再構築します。一方、ブラシ追加途中の失敗はそのスタンプだけ取り消します。任意例外を無視してゲームを続行する修正ではありません。

元のPhase 6.1レポートと既存テスト資料は履歴として保存しています。旧ブラウザ用スクリプトの旧キャッシュ期待値ではなく、最終版の実行にはPHASE61-AUDIT-TESTS.mdのauditスクリプトを使用してください。
