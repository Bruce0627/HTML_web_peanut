(() => {
  'use strict';

  const { copy, lang, page, products, shipping, maxQuantity, checkoutUrl } =
    JSON.parse(document.getElementById('store-data').textContent);
  const productById = new Map(products.map(product => [String(product.id), product]));
  const cartKey = 'ruixuan-cart-v1';
  const deliveryKey = 'ruixuan-delivery-v1';
  const format = new Intl.NumberFormat(lang);
  const money = amount => 'NT$' + format.format(amount);
  const merchantMoney = amount => 'NT$' + new Intl.NumberFormat('zh-Hant').format(amount);
  const validDelivery = selection => ['discuss', 'homeDelivery', 'pickup'].includes(selection);
  const select = (query, parent = document) => parent.querySelector(query);

  function stored(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function entries() {
    const data = stored(cartKey, {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data).flatMap(([id, quantity]) => {
      const product = productById.get(id);
      if (!product || !Number.isInteger(quantity) || quantity < 1) return [];
      const count = Math.min(quantity, maxQuantity);
      return [{ product, count, total: product.price * count }];
    });
  }

  function cartData(rows) {
    return Object.fromEntries(rows.map(row => [row.product.id, row.count]));
  }

  function quantityFrom(value, fallback = 1) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maxQuantity) : fallback;
  }

  function updateNav(rows) {
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    for (const badge of document.querySelectorAll('[data-cart-count]')) badge.textContent = format.format(count);
  }

  function preferredDelivery() {
    const selection = stored(deliveryKey, 'discuss');
    return validDelivery(selection) ? selection : 'discuss';
  }

  function orderNumbers(rows) {
    const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
    const delivery = subtotal > 0 && subtotal < shipping.freeFrom ? shipping.estimate : 0;
    return { subtotal, delivery, total: subtotal + delivery };
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setupCatalog() {
    const form = select('[data-filters]');
    const query = form.elements.search;
    const category = form.elements.category;
    const cards = Array.from(document.querySelectorAll('[data-catalog-item]'));
    const empty = select('[data-no-results]');

    function filter() {
      const terms = query.value.trim().toLocaleLowerCase(lang).split(/\s+/u).filter(Boolean);
      let matches = 0;
      for (const card of cards) {
        const names = card.dataset.productName.toLocaleLowerCase(lang);
        card.hidden = !((category.value === 'all' || card.dataset.group === category.value) &&
          terms.every(term => names.includes(term)));
        matches += Number(!card.hidden);
      }
      empty.hidden = matches > 0;
    }

    form.addEventListener('submit', event => { event.preventDefault(); filter(); });
    form.addEventListener('input', filter);
    category.addEventListener('change', filter);
    select('[data-clear-filters]').addEventListener('click', () => {
      form.reset();
      filter();
      query.focus();
    });
  }

  function setupProduct() {
    const form = select('[data-product-form]');
    const quantity = form.elements.quantity;
    const status = select('[data-product-status]');
    const product = productById.get(form.dataset.productId);
    for (const button of form.querySelectorAll('[data-step]')) {
      button.addEventListener('click', () => {
        const next = quantityFrom(quantity.value) + Number(button.dataset.step);
        quantity.value = Math.min(maxQuantity, Math.max(1, next));
      });
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const cart = cartData(entries());
      const next = (cart[product.id] ?? 0) + quantityFrom(quantity.value);
      if (next > maxQuantity) {
        status.textContent = copy.max;
        return;
      }
      cart[product.id] = next;
      if (!save(cartKey, cart)) {
        status.textContent = copy.storage;
        return;
      }
      updateNav(entries());
      if (event.submitter?.value === 'buy') {
        window.location.assign(checkoutUrl);
      } else {
        status.textContent = copy.added;
      }
    });
  }

  function cartItem(row) {
    const { product, count, total } = row;
    const entry = node('li', 'cart-item');
    entry.dataset.cartId = product.id;
    const picture = node('a', 'cart-image');
    picture.href = product.href;
    const image = node('img');
    image.src = product.image;
    image.alt = product.name;
    picture.append(image);

    const info = node('div', 'cart-info');
    const name = node('a', 'cart-product', product.name);
    name.href = product.href;
    const weight = product.weight ? ' · ' + product.weight + ' g' : '';
    info.append(name, node('p', 'small', money(product.price) + weight));

    const actions = node('div', 'cart-actions');
    const input = node('input', 'cart-quantity');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = 1;
    input.max = maxQuantity;
    input.step = 1;
    input.value = count;
    input.dataset.cartQuantity = product.id;
    input.setAttribute('aria-label', product.name + ' · ' + copy.quantity);
    const remove = node('button', 'remove-button', copy.remove);
    remove.type = 'button';
    remove.dataset.remove = product.id;
    remove.setAttribute('aria-label', copy.remove + ' · ' + product.name);
    actions.append(input, remove);

    const rowTotal = node('strong', 'cart-price', money(total));
    rowTotal.setAttribute('aria-label', copy.itemTotal + ' ' + money(total));
    entry.append(picture, info, actions, rowTotal);
    return entry;
  }

  function draftText(rows, delivery, numbers) {
    const methods = { discuss: '與商家確認', homeDelivery: '宅配到府', pickup: '超商取貨' };
    const items = rows.map(({ product, count, total }) => {
      const weight = product.weight ? '（' + product.weight + ' g）' : '（重量請確認）';
      return product.merchantName + weight + ' × ' + count + ' = ' + merchantMoney(total);
    });
    return [
      '您好，我想詢問瑞軒花生糖訂購：', ...items,
      '希望的配送：' + methods[delivery],
      '商品小計：' + merchantMoney(numbers.subtotal),
      '預估運費：' + merchantMoney(numbers.delivery),
      '預估總額：' + merchantMoney(numbers.total),
      '請協助確認庫存、運費與付款方式，謝謝。'
    ].join('\n');
  }

  function renderOrder() {
    const rows = entries();
    const empty = select('[data-empty-cart]');
    const filled = select('[data-filled-cart]');
    const items = select('[data-cart-items]');
    const delivery = select('[data-checkout-delivery]');
    const numbers = orderNumbers(rows);
    empty.hidden = rows.length > 0;
    filled.hidden = rows.length === 0;
    if (items) items.replaceChildren(...rows.map(cartItem));
    select('[data-subtotal]').textContent = money(numbers.subtotal);
    select('[data-shipping]').textContent = rows.length && !numbers.delivery ? copy.free : money(numbers.delivery);
    select('[data-total]').textContent = money(numbers.total);
    if (delivery) select('[data-draft]').value = rows.length ? draftText(rows, delivery.value, numbers) : '';
    updateNav(rows);
  }

  function setupCart() {
    const list = select('[data-cart-items]');
    const status = select('[data-cart-status]');
    list.addEventListener('change', event => {
      const input = event.target.closest('[data-cart-quantity]');
      if (!input) return;
      const cart = cartData(entries());
      const id = input.dataset.cartQuantity;
      if (!(id in cart)) { renderOrder(); return; }
      cart[id] = quantityFrom(input.value, cart[id]);
      const hadFocus = document.activeElement === input;
      if (!save(cartKey, cart)) status.textContent = copy.storage;
      renderOrder();
      if (hadFocus) select('[data-cart-quantity="' + id + '"]', list)?.focus();
    });
    list.addEventListener('click', event => {
      const control = event.target.closest('[data-remove]');
      if (!control) return;
      const cart = cartData(entries());
      delete cart[control.dataset.remove];
      status.textContent = save(cartKey, cart) ? copy.removed : copy.storage;
      renderOrder();
      (select('[data-remove]', list) ?? select('[data-empty-cart] a'))?.focus();
    });
    renderOrder();
  }

  function setupCheckout() {
    const delivery = select('[data-checkout-delivery]');
    const field = select('[data-draft]');
    const status = select('[data-copy-status]');
    delivery.value = preferredDelivery();
    delivery.addEventListener('change', () => { status.textContent = ''; renderOrder(); });
    select('[data-copy]').addEventListener('click', async () => {
      if (!field.value) return;
      try {
        await navigator.clipboard.writeText(field.value);
        status.textContent = copy.copied;
      } catch {
        field.focus();
        field.select();
        status.textContent = copy.copyHelp;
      }
    });
    renderOrder();
  }

  function setupSettings() {
    const form = select('[data-settings]');
    form.elements.delivery.value = preferredDelivery();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const selection = form.elements.delivery.value;
      if (!validDelivery(selection)) return;
      select('[data-save-status]').textContent = save(deliveryKey, selection) ? copy.saved : copy.settingsError;
    });
  }

  const setup = { home: setupCatalog, product: setupProduct, cart: setupCart, checkout: setupCheckout, settings: setupSettings };
  setup[page]?.();
  updateNav(entries());
  window.addEventListener('pageshow', () => {
    if (page === 'cart' || page === 'checkout') renderOrder();
    else updateNav(entries());
  });
  window.addEventListener('storage', event => {
    if (event.key !== cartKey && event.key !== null) return;
    if (page === 'cart' || page === 'checkout') renderOrder();
    else updateNav(entries());
  });
})();
