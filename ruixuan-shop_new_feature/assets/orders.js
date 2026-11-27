(() => {
  const api = new URL('../api/', document.currentScript.src);
  for (const form of document.querySelectorAll('[data-order-form]')) {
    const kind = form.dataset.orderForm;
    const status = form.querySelector('[role=status]');
    const button = form.querySelector('button');
    let rate;
    let lastPayload;
    let key;
    const oem = kind === 'oem';
    const updateEstimate = () => {
      if (!rate) return;
      const quantity = form.elements.quantity.valueAsNumber;
      form.querySelector('output').textContent = Number.isInteger(quantity) && quantity >= 1 && quantity <= 10000
        ? 'NT$' + (quantity * rate.unit + rate.setup).toLocaleString() : '—';
    };
    async function loadRate() {
      button.disabled = true;
      try {
        const result = await fetch(new URL('oem-rate', api), { cache: 'no-store' });
        rate = result.ok ? (await result.json()).rate : null;
      } catch {
        rate = null;
      }
      form.querySelector('[data-rate]').textContent = rate
        ? form.dataset.rateLabel.replace('{unit}', rate.unit).replace('{setup}', rate.setup)
        : form.dataset.unavailable;
      button.disabled = !rate;
      if (!rate) form.querySelector('output').textContent = '—';
      updateEstimate();
    }
    if (oem) {
      form.elements.quantity.addEventListener('input', updateEstimate);
      loadRate();
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled) return;
      const payload = { kind, contact: form.elements.contact.value.trim() };
      if (oem) {
        Object.assign(payload, rate, {
          quantity: form.elements.quantity.valueAsNumber,
          specification: form.elements.specification.value.trim()
        });
      } else {
        const cart = window.ruixuanCheckout?.();
        if (!cart?.items.length) return;
        Object.assign(payload, cart);
      }
      const serialized = JSON.stringify(payload);
      if (serialized !== lastPayload) {
        key = Array.from(crypto.getRandomValues(new Uint8Array(18)), n => n.toString(16).padStart(2, '0')).join('');
        lastPayload = serialized;
      }
      button.disabled = true;
      status.textContent = '';
      try {
        const result = await fetch(new URL('orders', api), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, key })
        });
        const data = await result.json();
        if (data.error === 'rate_changed' && oem) {
          await loadRate();
          status.textContent = form.dataset.rateChanged;
          return;
        }
        if (!result.ok) throw new Error(data.error);
        status.textContent = form.dataset.success.replace('{id}', data.id)
          .replace('{total}', 'NT$' + data.total.toLocaleString());
      } catch {
        status.textContent = form.dataset.failed;
      } finally {
        button.disabled = oem && !rate;
      }
    });
  }
})();
