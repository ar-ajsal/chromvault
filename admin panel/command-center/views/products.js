/* ============================================================================
   View: Products — card/table hybrid catalog with inventory status, search,
   category filter, and a premium editor drawer with Cloudinary image upload.
   API:
     GET    /products?title=&category=&page=&limit=
     POST   /products/:id      → read one (Dashtar convention)
     POST   /products/add      → create
     PATCH  /products/:id      → update
     PUT    /products/status/:id { status }
     DELETE /products/:id
     GET    /category
     POST   /cloudinary  (multipart 'file') → returns URL string
   ========================================================================== */
(function (global) {
  'use strict';
  global.Views = global.Views || {};
  var CC = global.CC, UI = global.UI, icon = global.icon;
  var esc = CC.esc, money = CC.money, locName = CC.locName;

  var q = { title: '', category: '', page: 1, limit: 24, view: 'grid' };
  var _categories = [];

  function render(root, params) {
    q = { title: '', category: '', page: 1, limit: 24, view: q.view || 'grid' };

    root.innerHTML =
      '<div class="page-head">' +
      '<div><div class="eyebrow">Catalog</div><h1>Products</h1>' +
      '<div class="sub" id="prodSub">Loading…</div></div>' +
      '<div class="head-actions">' +
      '<div class="seg" id="viewSeg"><button data-view="grid" class="' + (q.view === 'grid' ? 'active' : '') + '">' + icon('grid') + '</button>' +
      '<button data-view="table" class="' + (q.view === 'table' ? 'active' : '') + '">' + icon('menu') + '</button></div>' +
      '<button class="btn primary" id="newProduct">' + icon('plus') + 'New product</button>' +
      '</div></div>' +
      '<div class="toolbar">' +
      '<div class="search-box grow">' + icon('search') +
      '<input class="input" id="prodSearch" placeholder="Search products by title…"></div>' +
      '<select class="select" id="prodCat"><option value="">All categories</option></select>' +
      '</div>' +
      '<div id="prodContainer">' + UI.spinner() + '</div>' +
      '<div id="prodPager" style="margin-top:16px"></div>';

    // categories for the filter + editor
    CC.API.get('/category').then(function (d) {
      _categories = (d && d.categories) || [];
      var sel = root.querySelector('#prodCat');
      sel.innerHTML = '<option value="">All categories</option>' + _categories.map(function (c) {
        return '<option value="' + esc(c._id) + '">' + esc(locName(c.name, 'Category')) + '</option>';
      }).join('');
    }).catch(function () {});

    var doSearch = CC.debounce(function () { q.title = root.querySelector('#prodSearch').value.trim(); q.page = 1; load(root); }, 300);
    root.querySelector('#prodSearch').addEventListener('input', doSearch);
    root.querySelector('#prodCat').addEventListener('change', function () { q.category = this.value; q.page = 1; load(root); });
    root.querySelector('#newProduct').addEventListener('click', function () { openEditor(null); });
    root.querySelector('#viewSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]'); if (!b) return;
      q.view = b.getAttribute('data-view');
      CC.qsa('#viewSeg button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      load(root);
    });

    load(root);
    if (params && params.id) openEditor(params.id);
  }

  function load(root) {
    var box = root.querySelector('#prodContainer');
    box.innerHTML = UI.spinner();
    var path = '/products?page=' + q.page + '&limit=' + q.limit +
      (q.title ? '&title=' + encodeURIComponent(q.title) : '') +
      (q.category ? '&category=' + encodeURIComponent(q.category) : '');

    CC.API.get(path).then(function (d) {
      var products = (d && d.products) || [];
      root.querySelector('#prodSub').textContent = CC.num(d.totalDoc || 0) + ' product' + ((d.totalDoc === 1) ? '' : 's');
      if (!products.length) {
        box.innerHTML = UI.emptyState({ icon: 'box', title: 'No products found', body: 'Create your first product to get started.', actionLabel: 'New product', actionId: 'emptyNew' });
        var en = box.querySelector('#emptyNew'); if (en) en.addEventListener('click', function () { openEditor(null); });
        root.querySelector('#prodPager').innerHTML = '';
        return;
      }
      box.innerHTML = q.view === 'grid' ? gridHtml(products) : tableHtml(products);
      bindCards(root, box, products);
      root.querySelector('#prodPager').innerHTML = UI.pager(q.page, d.pages || 1, d.totalDoc || 0, q.limit);
      root.querySelector('#prodPager').querySelectorAll('[data-page]').forEach(function (b) {
        b.addEventListener('click', function () { if (b.getAttribute('data-page') === 'next') q.page++; else q.page--; load(root); });
      });
    }).catch(function (e) {
      box.innerHTML = UI.errorState(e.message, 'prodRetry');
      var rt = box.querySelector('#prodRetry'); if (rt) rt.addEventListener('click', function () { load(root); });
    });
  }

  function stockBadge(stock) {
    stock = stock || 0;
    if (stock === 0) return '<span class="badge bad">Out of stock</span>';
    if (stock <= 5) return '<span class="badge warn">' + stock + ' left</span>';
    return '<span class="badge ok">' + stock + ' in stock</span>';
  }

  function priceHtml(p) {
    var pr = p.prices || {};
    var price = pr.price || 0, orig = pr.originalPrice || 0;
    return '<span class="prod-price">' +
      (orig && orig > price ? '<del>' + money(orig) + '</del>' : '') +
      money(price) + '</span>';
  }

  function gridHtml(products) {
    return '<div class="prod-grid">' + products.map(function (p) {
      var img = (p.image && p.image[0]) ? '<img src="' + esc(p.image[0]) + '" alt="">' : '<div class="ph">' + icon('box') + '</div>';
      var hidden = (p.status || 'show') !== 'show';
      return '<div class="prod-card" data-id="' + esc(p._id) + '">' +
        '<div class="prod-media">' + img +
        '<div class="prod-stockflag">' + stockBadge(p.stock) + '</div>' +
        (hidden ? '<div class="prod-visflag"><span class="badge neutral">' + icon('eye-off') + 'Hidden</span></div>' : '') +
        '</div>' +
        '<div class="prod-body">' +
        '<div class="prod-title">' + esc(locName(p.title, 'Untitled')) + '</div>' +
        '<div class="prod-meta">' + priceHtml(p) + '</div>' +
        '</div>' +
        '<div class="prod-actions">' +
        '<button class="btn sm" data-edit="' + esc(p._id) + '">' + icon('edit') + 'Edit</button>' +
        '<button class="btn sm ghost" data-toggle="' + esc(p._id) + '" title="' + (hidden ? 'Show' : 'Hide') + '">' + icon(hidden ? 'eye' : 'eye-off') + '</button>' +
        '<button class="btn sm ghost" data-del="' + esc(p._id) + '" title="Delete">' + icon('trash') + '</button>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  function tableHtml(products) {
    return '<div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + products.map(function (p) {
        var img = (p.image && p.image[0]) ? '<img class="thumb" src="' + esc(p.image[0]) + '" alt="">' : '<div class="thumb thumb-ph">' + icon('box') + '</div>';
        var hidden = (p.status || 'show') !== 'show';
        var catName = catFor(p);
        return '<tr data-id="' + esc(p._id) + '">' +
          '<td data-label="Product"><div style="display:flex;align-items:center;gap:12px">' + img +
          '<span class="cell-strong">' + esc(locName(p.title, 'Untitled')) + '</span></div></td>' +
          '<td data-label="Category">' + esc(catName) + '</td>' +
          '<td data-label="Price">' + priceHtml(p) + '</td>' +
          '<td data-label="Stock">' + stockBadge(p.stock) + '</td>' +
          '<td data-label="Status"><span class="badge ' + (hidden ? 'neutral' : 'ok') + '">' + (hidden ? 'Hidden' : 'Live') + '</span></td>' +
          '<td data-label="" class="no-label"><div class="row-actions">' +
          '<button class="mini-btn" data-edit="' + esc(p._id) + '" title="Edit">' + icon('edit') + '</button>' +
          '<button class="mini-btn" data-toggle="' + esc(p._id) + '" title="' + (hidden ? 'Show' : 'Hide') + '">' + icon(hidden ? 'eye' : 'eye-off') + '</button>' +
          '<button class="mini-btn danger" data-del="' + esc(p._id) + '" title="Delete">' + icon('trash') + '</button>' +
          '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  function catFor(p) {
    var id = p.category || (p.categories && p.categories[0]);
    if (id && typeof id === 'object') return locName(id.name, '—');
    var c = _categories.find(function (x) { return x._id === id; });
    return c ? locName(c.name, '—') : '—';
  }

  function bindCards(root, box, products) {
    box.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openEditor(b.getAttribute('data-edit')); });
    });
    box.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = products.find(function (x) { return x._id === b.getAttribute('data-toggle'); });
        var next = (p && (p.status || 'show') === 'show') ? 'hide' : 'show';
        CC.API.put('/products/status/' + b.getAttribute('data-toggle'), { status: next })
          .then(function () { CC.toast('Product ' + (next === 'show' ? 'shown' : 'hidden')); load(root); })
          .catch(function (e) { CC.toast(e.message, 'bad'); });
      });
    });
    box.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = products.find(function (x) { return x._id === b.getAttribute('data-del'); });
        CC.confirmModal({ title: 'Delete product?', body: 'Delete "' + locName(p && p.title, 'this product') + '"? This cannot be undone.', ok: 'Delete', danger: true })
          .then(function (ok) {
            if (!ok) return;
            CC.API.del('/products/' + b.getAttribute('data-del'))
              .then(function () { CC.toast('Product deleted'); load(root); })
              .catch(function (e) { CC.toast(e.message, 'bad'); });
          });
      });
    });
    // click card/row body → edit
    box.querySelectorAll('[data-id]').forEach(function (c) {
      c.addEventListener('click', function () { openEditor(c.getAttribute('data-id')); });
    });
  }

  function ensureCategories() {
    if (_categories && _categories.length) return Promise.resolve(_categories);
    return CC.API.get('/category').then(function (d) {
      _categories = (d && d.categories) || [];
      return _categories;
    }).catch(function () { return []; });
  }

  // ---- Editor drawer --------------------------------------------------------
  function openEditor(id) {
    var isNew = !id;
    UI.openDrawer({
      title: isNew ? 'New product' : 'Edit product',
      sub: isNew ? 'Create a catalog entry' : 'Loading…',
      wide: true,
      bodyHtml: isNew ? '' : UI.spinner(),
      onMount: function (drawerEl, close) {
        ensureCategories().then(function () {
          if (isNew) {
            mountForm(drawerEl, {}, close);
          } else {
            CC.API.post('/products/' + id).then(function (p) {
              drawerEl.querySelector('.drawer-head .sub').textContent = CC.locName(p.title, '');
              mountForm(drawerEl, p, close);
            }).catch(function (e) {
              drawerEl.querySelector('#drawerBody').innerHTML = UI.errorState(e.message);
            });
          }
        });
      }
    });
  }

  function mountForm(drawerEl, p, close) {
    var pr = p.prices || {};
    var images = (p.image || []).slice();
    var currentCat = p.category || (p.categories && p.categories[0]);
    if (currentCat && typeof currentCat === 'object') currentCat = currentCat._id;

    var body = drawerEl.querySelector('#drawerBody');
    body.innerHTML =
      '<div class="dsec"><div class="dsec-title">' + icon('image') + 'Images</div>' +
      '<div class="uploader" id="uploader"></div>' +
      '<div class="hint" style="font-size:11px;color:var(--ink-3)">First image is the cover. JPG/PNG/WebP.</div></div>' +

      '<div class="dsec"><div class="dsec-title">' + icon('tag') + 'Details</div>' +
      '<div class="field"><label>Title <span style="color:var(--bad)">*</span></label><input class="input" id="fTitle" value="' + esc(CC.locName(p.title, '')) + '" placeholder="Product title"></div>' +
      '<div class="field"><label>Slug</label><input class="input" id="fSlug" value="' + esc(p.slug || '') + '" placeholder="auto-generated-if-blank"></div>' +
      '<div class="field"><label>Description</label><textarea class="input" id="fDesc" placeholder="Short description">' + esc(CC.locName(p.description, '')) + '</textarea></div>' +
      '<div class="field"><label>Category <span style="color:var(--bad)">*</span></label>' +
      '<select class="select" id="fCat"><option value="">— Select a Category (Required) —</option>' +
      _categories.map(function (c) { return '<option value="' + esc(c._id) + '"' + (c._id === currentCat ? ' selected' : '') + '>' + esc(CC.locName(c.name, 'Category')) + '</option>'; }).join('') +
      '</select><div class="hint" style="font-size:11px;color:var(--ink-3)">Every product must be assigned to a category.</div></div></div>' +

      '<div class="dsec"><div class="dsec-title">' + icon('rupee') + 'Pricing & stock</div>' +
      '<div class="grid grid-3" style="gap:12px">' +
      '<div class="field"><label>Price (₹)</label><input class="input" id="fPrice" type="number" min="0" step="1" value="' + (pr.price || 0) + '"></div>' +
      '<div class="field"><label>Compare-at (₹)</label><input class="input" id="fOrig" type="number" min="0" step="1" value="' + (pr.originalPrice || 0) + '"></div>' +
      '<div class="field"><label>Stock</label><input class="input" id="fStock" type="number" min="0" step="1" value="' + (p.stock || 0) + '"></div>' +
      '</div></div>' +

      '<div class="dsec"><div class="dsec-title">' + icon('settings') + 'Visibility</div>' +
      '<div class="field"><label>Status</label><select class="select" id="fStatus">' +
      '<option value="show"' + ((p.status || 'show') === 'show' ? ' selected' : '') + '>Live (visible)</option>' +
      '<option value="hide"' + ((p.status || 'show') === 'hide' ? ' selected' : '') + '>Hidden</option>' +
      '</select></div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);margin-top:6px">' +
      '<input type="checkbox" id="fFeatured"' + (p.isFeatured ? ' checked' : '') + '> Featured product</label>' +
      '</div>';

    // footer
    var foot = drawerEl.querySelector('.drawer-foot') || (function () {
      var f = CC.el('div', { class: 'drawer-foot' }); drawerEl.appendChild(f); return f;
    })();
    foot.innerHTML =
      '<button class="btn ghost" id="cancelEdit">Cancel</button>' +
      '<button class="btn primary" id="saveProduct">' + icon('save') + (p._id ? 'Save changes' : 'Create product') + '</button>';

    // ---- image uploader ----
    function renderUploader() {
      var host = body.querySelector('#uploader');
      host.innerHTML = images.map(function (url, i) {
        return '<div class="up-thumb"><img src="' + esc(url) + '" alt="">' +
          '<button class="rm" data-rm="' + i + '" title="Remove">' + icon('x') + '</button></div>';
      }).join('') +
        '<label class="up-slot" title="Upload image">' + icon('upload') +
        '<input type="file" accept="image/*" hidden id="fileInput"></label>';
      host.querySelectorAll('[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () { images.splice(+b.getAttribute('data-rm'), 1); renderUploader(); });
      });
      var fi = host.querySelector('#fileInput');
      fi.addEventListener('change', function () {
        var file = fi.files && fi.files[0]; if (!file) return;
        var slot = host.querySelector('.up-slot');
        slot.innerHTML = '<div class="spinner" style="width:22px;height:22px;border-width:2px"></div>';
        CC.API.upload(file).then(function (res) {
          // upload endpoint returns the URL as a plain string
          var url = typeof res === 'string' ? res : (res && (res.url || res.secure_url || res.path));
          if (!url) throw new Error('Upload failed.');
          images.push(url); renderUploader();
        }).catch(function (e) { CC.toast(e.message || 'Upload failed', 'bad'); renderUploader(); });
      });
    }
    renderUploader();

    foot.querySelector('#cancelEdit').addEventListener('click', close);
    foot.querySelector('#saveProduct').addEventListener('click', function () {
      var title = body.querySelector('#fTitle').value.trim();
      if (!title) { CC.toast('Title is required', 'bad'); body.querySelector('#fTitle').focus(); return; }
      var cat = body.querySelector('#fCat').value;
      if (!cat) {
        CC.toast('Category is required. Please choose a category for this product.', 'bad');
        body.querySelector('#fCat').focus();
        return;
      }
      var slug = body.querySelector('#fSlug').value.trim() ||
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var price = Math.max(0, parseFloat(body.querySelector('#fPrice').value) || 0);
      var orig = Math.max(0, parseFloat(body.querySelector('#fOrig').value) || 0);
      var discount = orig > price ? orig - price : 0;

      var payload = {
        title: { en: title },
        description: { en: body.querySelector('#fDesc').value.trim() },
        slug: slug,
        category: cat,
        categories: [cat],
        image: images,
        stock: Math.max(0, parseInt(body.querySelector('#fStock').value, 10) || 0),
        prices: { price: price, originalPrice: orig || price, discount: discount },
        status: body.querySelector('#fStatus').value,
        isFeatured: body.querySelector('#fFeatured').checked
      };

      var btn = foot.querySelector('#saveProduct'); btn.disabled = true;
      var req = p._id ? CC.API.patch('/products/' + p._id, payload) : CC.API.post('/products/add', payload);
      req.then(function () {
        CC.toast(p._id ? 'Product updated' : 'Product created', 'ok');
        close();
        global.App.render();
      }).catch(function (e) { CC.toast(e.message, 'bad'); btn.disabled = false; });
    });
  }

  global.Views.products = { title: 'Products', crumb: 'Products', render: render, openEditor: openEditor };
})(window);
