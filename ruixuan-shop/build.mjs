import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brand, maxQuantity, products, shipping } from './source/catalog.mjs';
import { languageText, locales } from './source/text.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const line = `https://line.me/R/ti/p/${encodeURIComponent(brand.lineId)}`;
const routes = {
  home: 'index.html',
  about: 'HTML/contract.html',
  news: 'HTML/content.html',
  cart: 'HTML/shopppingcar.html',
  checkout: 'HTML/checkout.html',
  settings: 'HTML/member.html'
};

const esc = value => String(value).replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const url = value => value.split('/').map(encodeURIComponent).join('/');
const assetFor = image => `picture/${image}`;
const money = amount => `NT$${new Intl.NumberFormat('en-TW').format(amount)}`;

function relative(from, to) {
  return url(path.posix.relative(path.posix.dirname(from), to));
}

function renderPage({ locale, index, page, product, alias }) {
  const route = product ? `HTML/product${product.id}.html` : routes[page];
  const file = path.posix.join(locale.path, alias ?? route);
  const copy = languageText(index);
  const t = key => esc(copy[key]);
  const local = key => relative(file, path.posix.join(locale.path, routes[key]));
  const productUrl = item => relative(file, path.posix.join(locale.path, `HTML/product${item.id}.html`));
  const asset = location => relative(file, location);
  const photo = (item, extra = '') => `<img src="${asset(assetFor(item.image))}" alt="${esc(item.names[index])}" ${extra}>`;
  const packageSize = item => item.weight ? `${item.weight} g` : t('confirmWeight');
  const external = (href, label, styles = 'button secondary') =>
    `<a class="${styles}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  const phone = styles => `<a class="${styles}" href="tel:${brand.phone}">${t('call')} <span>${esc(brand.phone)}</span></a>`;
  const productData = products.map(item => ({
    id: item.id, name: item.names[index], merchantName: item.names[0], weight: item.weight,
    price: item.price, image: asset(assetFor(item.image)), href: productUrl(item)
  }));

  function header() {
    const nav = [
      ['home', 'browse'], ['about', 'about'], ['news', 'news']
    ].map(([target, name]) =>
      `<a href="${local(target)}"${page === target ? ' aria-current="page"' : ''}>${t(name)}</a>`).join('');
    const links = locales.map(option =>
      `<a href="${relative(file, path.posix.join(option.path, route))}" lang="${option.code}" hreflang="${option.code}"${locale.code === option.code ? ' aria-current="true"' : ''}>${option.label}</a>`).join('');
    return `<a class="skip" href="#content">${t('skip')}</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${local('home')}"><img src="${asset('picture/logo.jpg')}" alt="" width="44" height="44"><span>${esc(brand.name)}</span></a>
    <nav aria-label="${t('menu')}">${nav}</nav>
    <div class="header-actions">
      <details class="language"><summary aria-label="${t('language')}">${locale.label}</summary><div>${links}</div></details>
      <a class="cart-link" href="${local('cart')}"${page === 'cart' ? ' aria-current="page"' : ''}>${t('cart')} <span data-cart-count>0</span></a>
    </div>
  </div>
</header>`;
  }

  function footer() {
    return `<footer class="site-footer"><div class="container footer-inner">
      <div><strong>${esc(brand.name)}</strong><p><a href="tel:${brand.phone}">${esc(brand.phone)}</a> <span class="dot">·</span> LINE ${esc(brand.lineId)}</p></div>
      <div><a href="${local('settings')}">${t('settings')}</a>
        ${external(brand.facebook, copy.facebook, 'footer-link')}</div>
    </div></footer>`;
  }

  function home() {
    const cards = products.map(item => `<article class="product-card" data-catalog-item data-group="${item.group}" data-product-name="${esc(item.names.join(' '))}">
      <a href="${productUrl(item)}">
        ${photo(item, 'loading="lazy" decoding="async"')}
        <div><h3>${esc(item.names[index])}</h3>
          <p><strong>${money(item.price)}</strong><span>${packageSize(item)}</span></p>
        </div>
      </a>
    </article>`).join('');
    const options = ['all', 'peanut', 'brittle', 'cashew'].map(key => `<option value="${key}">${t(key)}</option>`).join('');
    const headline = index === 0 ? '<span>傳統手作</span><span>花生糖</span>' : index === 2 ? '<span>手づくり</span><span>ピーナッツ飴</span>' : t('heroTitle');
    return `<section class="hero container">
  <div class="hero-text"><h1>${headline}</h1><p>${t('heroCopy')}</p>
    <div class="actions"><a class="button primary" href="#products">${t('browse')}</a>
    ${external(asset('picture/花生糖價目表2.jpg'), copy.priceList)}</div>
  </div>
  ${photo(products[0], 'class="hero-photo" fetchpriority="high"')}
</section>
<section class="container catalog" id="products">
  <div class="section-heading"><h2>${t('products')}</h2>
    <form class="filters" data-filters role="search">
      <label class="visually-hidden" for="search">${t('search')}</label>
      <input type="search" id="search" name="search" placeholder="${t('search')}">
      <select name="category" aria-label="${t('products')}">${options}</select>
    </form>
  </div>
  <div class="product-grid">${cards}</div>
  <div data-no-results hidden class="empty-search" aria-live="polite"><p>${t('noResults')}</p>
    <button type="button" data-clear-filters class="button secondary">${t('showAll')}</button>
  </div>
</section>`;
  }

  function productPage() {
    return `<section class="container page product-page">
      <a class="back" href="${local('home')}#products">← ${t('productList')}</a>
      <div class="product-detail">
        ${photo(product, 'class="product-photo" fetchpriority="high"')}
        <div class="product-information">
          <h1>${esc(product.names[index])}</h1><p>${esc(product.notes[index])}</p>
          <p class="product-price"><strong>${money(product.price)}</strong> <span>${packageSize(product)}</span></p>
          <form data-product-form data-product-id="${product.id}">
            <label for="quantity">${t('quantity')}</label>
            <div class="quantity">
              <button type="button" data-step="-1" aria-label="${t('minus')}">−</button>
              <input type="number" inputmode="numeric" id="quantity" name="quantity" min="1" max="${maxQuantity}" step="1" value="1" required>
              <button type="button" data-step="1" aria-label="${t('plus')}">+</button>
            </div>
            <div class="actions">
              <button class="button secondary" type="submit" value="add">${t('add')}</button>
              <button class="button primary" type="submit" value="buy">${t('buy')}</button>
            </div>
            <p class="status" role="status" data-product-status></p>
          </form>
          <p class="small">${t('allergens')}</p>
        </div>
      </div>
      <details class="product-policy"><summary>${t('shippingAndPayment')}</summary><p>${t('orderPolicy')}</p></details>
    </section>`;
  }

  const deliveryOptions = () => ['discuss', 'homeDelivery', 'pickup']
    .map(key => `<option value="${key}">${t(key)}</option>`).join('');

  function emptyCart() {
    return `<div class="panel empty" data-empty-cart hidden><h2>${t('emptyTitle')}</h2>
      <p>${t('emptyCopy')}</p><a class="button primary" href="${local('home')}#products">${t('backShop')}</a></div>`;
  }

  function totals() {
    return `<dl class="totals">
      <div><dt>${t('subtotal')}</dt><dd data-subtotal></dd></div>
      <div><dt>${t('shipping')}</dt><dd data-shipping></dd></div>
      <div><dt>${t('total')}</dt><dd data-total></dd></div>
    </dl>`;
  }

  function cartPage() {
    return `<section class="container page">
      <a class="back" href="${local('home')}#products">← ${t('backShop')}</a>
      <h1>${t('cart')}</h1>
      <p class="visually-hidden" role="status" data-cart-status></p>
      ${emptyCart()}
      <div class="order-layout" data-filled-cart hidden>
        <ul class="cart-items" data-cart-items></ul>
        <aside class="panel estimate"><h2>${t('summary')}</h2>${totals()}
          <p class="small">${t('cartNote')}</p>
          <a class="button primary" href="${local('checkout')}" data-checkout-link>${t('checkout')}</a>
        </aside>
      </div>
    </section>`;
  }

  function checkoutPage() {
    return `<section class="container page">
      <a class="back" href="${local('cart')}">← ${t('editCart')}</a>
      <h1>${t('orderTitle')}</h1>
      ${emptyCart()}
      <div class="order-layout" data-filled-cart hidden>
        <div class="panel checkout">
          <p>${t('orderHelp')}</p>
          <label for="delivery">${t('delivery')}</label><select id="delivery" data-checkout-delivery>${deliveryOptions()}</select>
          <label for="order-summary">${t('draft')}</label><textarea id="order-summary" data-draft rows="8" readonly></textarea>
          <div class="actions">
            <button class="button secondary" data-copy type="button">${t('copy')}</button>
            ${external(line, copy.orderLine, 'button primary')}
          </div>
          <p class="status" role="status" data-copy-status></p>
          ${phone('text-link')}
        </div>
        <aside class="panel estimate"><h2>${t('summary')}</h2>${totals()}<p class="small">${t('cartNote')}</p></aside>
      </div>
    </section>`;
  }

  function settingsPage() {
    return `<section class="container page"><h1>${t('settings')}</h1>
      <form class="panel settings" data-settings><p>${t('settingsCopy')}</p>
        <label for="preferred-delivery">${t('delivery')}</label>
        <select id="preferred-delivery" name="delivery">${deliveryOptions()}</select>
        <button class="button primary" type="submit">${t('save')}</button>
        <p role="status" class="status" data-save-status></p>
      </form>
    </section>`;
  }

  function about() {
    return `<section class="container page brand-page"><h1>${t('about')}</h1>
      <div class="panel story">
        <img src="${asset('picture/logo2.jpg')}" alt="${esc(brand.name)}">
        <div><h2>${t('heritageTitle')}</h2><p>${t('heritage')}</p>${external(brand.film, copy.film)}</div>
      </div>
      <div class="panel contact"><div><h2>${t('contact')}</h2>
        <p>LINE ${esc(brand.lineId)}</p>
        <div class="actions">${external(line, copy.orderLine, 'button primary')}
          ${external(brand.maps, copy.maps)}${phone('text-link')}
        </div>
      </div><img loading="lazy" src="${asset('picture/line-order.png')}" alt="${t('qr')}" width="136" height="136"></div>
    </section>`;
  }

  function news() {
    return `<section class="container page"><h1>${t('news')}</h1>
      <article class="panel news-story"><div><h2>${t('announcementTitle')}</h2>
        <p>${t('announcement')}</p><div class="actions">
          ${external(brand.announcement, copy.announcementLink, 'button secondary')}
          ${external(line, copy.orderLine, 'button primary')}
        </div>
      </div></article>
    </section>`;
  }

  const view = { home, product: productPage, cart: cartPage, checkout: checkoutPage, settings: settingsPage, about, news }[page];
  const title = product ? product.names[index] : copy[page === 'home' ? 'browse' : page];
  const data = JSON.stringify({
    lang: locale.code, page, copy, products: productData, maxQuantity, shipping,
    checkoutUrl: local('checkout')
  }).replace(/</g, '\\u003c');
  const heading = page === 'home' ? brand.name : `${title} | ${brand.name}`;
  return { file, html: `<!doctype html>
<html lang="${locale.code}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(heading)}</title>
  <link rel="icon" href="${asset('picture/logo.jpg')}">
  <link rel="stylesheet" href="${asset('assets/store.css')}">
  <script defer src="${asset('assets/store.js')}"></script>
</head>
<body>
${header()}
<main id="content">
${view()}
</main>
${footer()}
<script type="application/json" id="store-data">${data}</script>
</body>
</html>
` };
}

for (const [index, locale] of locales.entries()) {
  const pages = [
    ...Object.keys(routes).map(page => ({ page })),
    { page: 'home', alias: 'HTML/index.html' },
    { page: 'home', alias: 'HTML/main.html' },
    ...products.map(product => ({ page: 'product', product }))
  ];
  for (const entry of pages) {
    const { file, html } = renderPage({ ...entry, locale, index });
    const output = path.join(root, file);
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, html);
  }
}
