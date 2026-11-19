/* ECHTSTEIN – Korrekturen für die Aurate-Version.
   Einbinden direkt vor </body>, NACH dem bestehenden <script>:
   <script src="echtstein-fix-aurate.js"></script> */

const FIXA = {
  FORMSPREE_URL: 'https://formspree.io/f/mnpdzavw',  // Bestell- und Newsletter-Mails: auf formspree.io Formular anlegen, Link eintragen
  PAYPAL_CLIENT_ID: 'Af5cgcWw50_BjmgYOKZSbOBlxe4cT2u53uTWSfxP9TVs5KT9ASoVFkjYSj-9jafwuANTQQTqICgmyzsg' // Sandbox-ID; für echte Zahlungen die Live-ID eintragen
};

/* ---------- Kopf: doppelten Titel entfernen, Warenkorb-Text kürzen ---------- */
document.querySelectorAll('title').forEach((t, i) => { if (i) t.remove(); });
const _cb = document.querySelector('.header-actions .icon-btn');
if (_cb) _cb.innerHTML = '<span class="cart-word">Einkaufstasche</span><span class="cart-short">Tasche</span> (<span id="cartCount">0</span>)';

/* ---------- Stil ---------- */
document.head.insertAdjacentHTML('beforeend', '<style>' +
  /* Nur das Symbol in der Kopfzeile bekommt dickere Linien */
  '.header-left .logo-icon{filter:drop-shadow(.8px 0 0 #111) drop-shadow(-.8px 0 0 #111) drop-shadow(0 .8px 0 #111) drop-shadow(0 -.8px 0 #111)}' +
  /* Menü: Links erst ab 1280 px, sonst Burger (sonst läuft die Kopfzeile über) */
  '@media(min-width:1024px) and (max-width:1279px){.top-nav{display:none}.menu-btn{display:inline-flex}}' +
  '.cart-short{display:none}' +
  '@media(max-width:640px){.cart-word{display:none}.cart-short{display:inline}header{padding:12px 14px}}' +
  /* Kategorie-Kacheln: 3 + 3, ohne Zwischenraum */
  '.full-bleed-section .aurate-grid-3{gap:0;background:none}' +
  '@media(min-width:768px){.full-bleed-section .aurate-grid-3{grid-template-columns:repeat(3,1fr)}.cat-card{aspect-ratio:4/3;max-height:none}}' +
  /* Karten: Button am Handy sichtbar, Bilder nicht mehr ziehbar (stört das Wischen) */
  '@media(max-width:768px){.prod-quick{position:absolute;left:10px;right:10px;bottom:10px;margin:0;border:1px solid var(--ink);opacity:1;transform:none;padding:9px}}' +
  '.prod-media img{pointer-events:none;-webkit-user-drag:none}' +
  ':focus-visible{outline:2px solid var(--ink);outline-offset:2px}' +
  '</style>');

/* ---------- Karten: echter Rabatt in %, Tastaturbedienung ---------- */
const _pc = productCardHTML;
productCardHTML = function (p, x) {
  let h = _pc(p, x);
  if (p.oldPrice) h = h.replace('-20 % Winter', '-' + Math.round((1 - p.price / p.oldPrice) * 100) + ' %');
  return h.replace('class="prod-media"', `class="prod-media" tabindex="0" role="button" onkeydown="if(event.key==='Enter')openProductModal('${p.id}')"`);
};
renderHomeSliders();

/* ---------- Warenkorb speichern ---------- */
saveCart = function () {
  updateCartBadge();
  try { localStorage.setItem('echtstein_cart', JSON.stringify(cart)); } catch (e) {}
};
try { cart = (JSON.parse(localStorage.getItem('echtstein_cart')) || []).filter(i => PRODUCTS.some(p => p.id === i.id)); } catch (e) {}
updateCartBadge();

/* ---------- Esc schließt Fenster ---------- */
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAllDrawers(); closeProductModal(); closeLegalModal(); } });

/* ---------- Hilfen ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const cartLines = () => cart.map(i => { const p = PRODUCTS.find(x => x.id === i.id); return p ? `${i.qty} x ${p.name} (${formatEUR(p.price)})` : ''; }).join('\n');
async function postFormA(data) {
  if (!FIXA.FORMSPREE_URL) throw new Error('FORMSPREE_URL fehlt');
  const r = await fetch(FIXA.FORMSPREE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error('Senden fehlgeschlagen');
}

/* ---------- PayPal wirklich einbinden (fehlte komplett), keine Schein-Zahlung mehr ---------- */
if (typeof paypal === 'undefined') {
  const s = document.createElement('script');
  s.src = 'https://www.paypal.com/sdk/js?client-id=' + FIXA.PAYPAL_CLIENT_ID + '&currency=EUR';
  document.head.appendChild(s);
}
simulatePayPal = function () { showToast('Zahlung derzeit nicht möglich'); };
mountPayPal = function () {
  const { total } = cartTotals(), box = document.getElementById('paypal-button-container');
  if (typeof paypal === 'undefined' || !paypal.Buttons) { box.textContent = 'PayPal konnte nicht geladen werden. Bitte Seite neu laden oder später erneut versuchen.'; return; }
  const n = 'EST-' + Math.floor(100000 + Math.random() * 900000);
  paypal.Buttons({
    style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'paypal' },
    onClick: (d, a) => document.getElementById('checkoutForm').reportValidity() ? a.resolve() : a.reject(),
    createOrder: (d, a) => a.order.create({ purchase_units: [{ custom_id: n, amount: { currency_code: 'EUR', value: total.toFixed(2) } }] }),
    onApprove: (d, a) => a.order.capture().then(async det => {
      const v = id => document.getElementById(id).value.trim();
      let sent = true;
      try {
        await postFormA({ _subject: 'Neue PayPal-Bestellung ' + n, Bestellnummer: n, PayPalID: det.id, Name: v('cFirst') + ' ' + v('cLast'), email: v('cEmail'), Adresse: v('cStreet') + ', ' + v('cZip') + ' ' + v('cCity'), Artikel: cartLines(), Summe: formatEUR(total) });
      } catch (e) { sent = false; }
      completeOrder(v('cFirst'), n, sent);
    }),
    onError: () => showToast('PayPal-Fehler, bitte erneut versuchen')
  }).render('#paypal-button-container');
};
completeOrder = function (name, n, sent) {
  cart = []; saveCart();
  document.getElementById('cartBody').innerHTML = `
    <div style="padding:36px 0">
      <span class="eyebrow" style="color:var(--muted)">Bestellung eingegangen</span>
      <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:32px;margin:0 0 14px">Vielen Dank${name ? ', ' + esc(name) : ''}.</h3>
      <p style="font-size:14px;line-height:1.75;color:var(--muted)">Ihre Zahlung wurde von PayPal bestätigt. Bestellnummer: <strong>${esc(n || '')}</strong>.${sent ? ' Wir haben Ihre Bestellung erhalten und bereiten sie vor.' : ' Bitte melden Sie sich mit dieser Nummer bei uns, damit wir Ihre Lieferadresse haben.'}</p>
    </div>`;
  document.getElementById('cartFoot').innerHTML = '<button class="btn-primary" onclick="closeAllDrawers()">Weiter entdecken</button>';
};

/* ---------- Newsletter: wirklich senden, mit Einwilligung ---------- */
const _nlf = document.querySelector('form.newsletter');
if (_nlf) _nlf.insertAdjacentHTML('afterend', '<label style="display:block;font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5"><input type="checkbox" id="nlOk"> Ich möchte den Newsletter erhalten und habe die <a href="#datenschutz" onclick="openLegalModal(\'datenschutz\');return false" style="text-decoration:underline">Datenschutzerklärung</a> gelesen.</label>');
subscribeNewsletter = async function (e) {
  e.preventDefault();
  if (!document.getElementById('nlOk').checked) { showToast('Bitte Einwilligung bestätigen'); return; }
  try {
    await postFormA({ _subject: 'Newsletter-Anmeldung', email: document.getElementById('nlEmail').value });
    document.getElementById('nlEmail').value = ''; document.getElementById('nlOk').checked = false;
    showToast('Danke für Ihre Anmeldung');
  } catch (x) { showToast('Anmeldung gerade nicht möglich'); }
};
