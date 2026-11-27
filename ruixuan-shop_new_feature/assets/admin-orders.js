const form = document.querySelector('form');
const status = document.querySelector('[role=status]');
const results = document.querySelector('#orders');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const date = new Intl.DateTimeFormat('zh-TW', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei'
});
const delivery = { discuss: '與店家確認', homeDelivery: '宅配到府', pickup: '超商取貨' };
const money = amount => 'NT$' + amount.toLocaleString('zh-TW');
let page = 1;
let filters;
let sequence = 0;

function render(order) {
  const entry = document.createElement('details');
  entry.className = 'panel';
  const title = document.createElement('summary');
  const oem = order.kind === 'oem';
  const info = order.details;
  title.textContent = `${date.format(new Date(order.created_at))} · ${oem ? '代工' : '商品'} · ${money(order.total)}`;
  entry.append(title);
  const lines = ['訂單編號 ' + order.id, '聯絡方式 ' + order.contact];
  if (oem) {
    lines.push('代工需求 ' + info.specification, '數量 ' + info.quantity,
      '單價 ' + money(info.unitPrice), '開工費 ' + money(info.setupFee));
  } else {
    lines.push(...info.items.map(item => `${item.name} × ${item.quantity}（每件 ${money(item.unitPrice)}）`),
      '配送方式 ' + delivery[info.delivery], '預估運費 ' + money(info.deliveryFee));
  }
  for (const line of lines) {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    entry.append(paragraph);
  }
  return entry;
}

async function search(number) {
  const current = ++sequence;
  const query = new URLSearchParams({ ...filters, page: number });
  const url = new URL('../api/admin/orders?' + query, document.baseURI);
  previous.hidden = next.hidden = true;
  results.replaceChildren();
  status.textContent = '查詢中…';
  try {
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + form.elements.token.value } });
    if (current !== sequence) return;
    if (!response.ok) {
      status.textContent = response.status === 401 ? '管理金鑰錯誤。' :
        response.status === 503 ? '伺服器尚未設定管理金鑰。' : '查詢失敗。';
      return;
    }
    const data = await response.json();
    if (current !== sequence) return;
    page = number;
    results.replaceChildren(...data.orders.map(render));
    status.textContent = data.orders.length ? '第 ' + page + ' 頁' : '查無訂單。';
    previous.hidden = page === 1;
    next.hidden = !data.more;
  } catch {
    if (current === sequence) status.textContent = '無法連線，請重試。';
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  filters = { kind: form.elements.kind.value, q: form.elements.query.value };
  search(1);
});
previous.addEventListener('click', () => search(page - 1));
next.addEventListener('click', () => search(page + 1));
