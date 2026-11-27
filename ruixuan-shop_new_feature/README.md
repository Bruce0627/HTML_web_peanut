# 瑞軒花生糖網站

這份網站可用 Node.js 在本機預覽。解壓縮後，在網站目錄開啟 PowerShell，執行 `node preview.mjs`，再開啟 <http://127.0.0.1:4173/>。購物車、配送偏好會依瀏覽器及網站網址儲存。

## 訂單與代工

請使用 Node.js 24 或更新版本。在網站目錄開啟 PowerShell，將下列示範費率換成店家的正式費率後啟動：

```powershell
$env:ORDER_ADMIN_TOKEN = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
$env:OEM_UNIT_PRICE = '30'
$env:OEM_SETUP_FEE = '500'
node preview.mjs
```

代工預估費用以新台幣計算，公式為「件數 × 每件費率 + 開工費」。每件費率必須是正整數，開工費預設為 0。未設定有效的每件費率時，代工表單會暫停送單。店家收到訂單後再確認規格、交期與付款。

店家在 <http://127.0.0.1:4173/admin/> 輸入管理金鑰查詢。啟動伺服器前，在同一個 PowerShell 視窗執行 `$env:ORDER_ADMIN_TOKEN` 取得金鑰並妥善保存。可按商品或代工分類，以完整訂單編號或部分聯絡方式搜尋。商品與代工訂單儲存在 `data/orders.sqlite`。以 LINE 或電話直接聯繫的訂購仍由店家自行處理。

正式部署需使用可執行 Node.js、提供 HTTPS 且有持久磁碟的主機。把管理金鑰與正式費率設為伺服器環境變數，保留並備份 `data/`。若主機需要監聽外部介面，設 `HOST=0.0.0.0`，並使用主機的 HTTPS 反向代理。GitHub Pages 僅提供靜態頁面，需改由此 Node.js 服務提供網站與 API。

網站有繁體中文、英文和日文。購物車先依原始頁面做費用試算。商品總額滿 NT$1,000 時顯示免運，未滿暫用 NT$60。訪客可複製中文訂購摘要，到商家 LINE 或電話確認實際庫存、配送與付款。本站提供訂購詢問，商家收到訊息後確認訂單。

商品資料在 `source/catalog.mjs`，介面文字在 `source/text.mjs`。修改後執行 `node build.mjs` 產生三種語言的靜態頁面。

腰果酥採原價目表的 150 g。蔓越莓腰果酥的舊首頁與商品頁重量不同，頁面請訪客向商家確認。LINE 帳號採原稿公告所列的 `@487ubosi`。
