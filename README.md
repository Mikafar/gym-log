# Gym 記錄 v1

簡單嘅健身訓練記錄 PWA：訓練 → 動作 → 每組（次數、kg），有「複製上一組」、備註、修改／刪除、本週總結同近 7 日訓練量圖。
純靜態，冇後端，資料只儲喺瀏覽器 localStorage（key: `gym-log-v1`），可以喺 ⚙︎ 匯出／匯入 JSON 備份。

## 本機試用
    cd health-app && python3 -m http.server 8000
    # 開 http://localhost:8000

## 喺 iPhone 用
「加入主畫面」同離線快取需要 HTTPS。將成個資料夾放上任何私人 HTTPS 靜態主機，用 Safari 開 → 分享 → 加入主畫面。

## 檔案
index.html / style.css / app.js（App）· manifest.webmanifest / sw.js（PWA）· icon-192.png / icon-512.png / apple-touch-icon.png · screenshots/（用臨時測試資料，App 本身冇預設資料）
