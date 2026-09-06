/* ============================================================================
   View: Settings — admin profile, invoice & dispatch From Address,
   team management (super-admin only), and session controls.
   ========================================================================== */
(function (global) {
  'use strict';
  global.Views = global.Views || {};
  var CC = global.CC, UI = global.UI, icon = global.icon;
  var esc = CC.esc;

  function render(root) {
    var info = CC.Session.get() || {};
    var role = (info.role || 'admin').toString();
    var isSuper = role.toLowerCase() === 'super admin' || role.toLowerCase() === 'superadmin';
    var name = info.name || 'Admin';
    if (typeof name === 'object' && name !== null) {
      name = name.en || Object.values(name)[0] || 'Admin';
    }
    var initial = (name.trim()[0] || 'A').toUpperCase();

    // Load current From Address settings
    var fromSettings = (global.Invoice && global.Invoice.getFromSettings)
      ? global.Invoice.getFromSettings()
      : {
          storeName: 'CHROMORA',
          phone: '+91 9400 123 456',
          address: 'Hill View Arcade, NH 66, Kakkanchery, Malappuram, Kerala - 671321, India'
        };

    root.innerHTML =
      '<div class="page-head">' +
      '<div><div class="eyebrow">System</div><h1>Settings</h1>' +
      '<div class="sub">Your profile, store dispatch address, team access and session.</div></div>' +
      '</div>' +

      // Top Row: Profile & Session
      '<div class="grid grid-2" style="margin-bottom:20px">' +
      // profile
      '<div class="panel"><div class="panel-head"><h3>' + icon('user') + 'Profile</h3></div>' +
      '<div class="panel-pad">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">' +
      '<div class="avatar" style="width:60px;height:60px;font-size:24px;border-radius:16px">' + esc(initial) + '</div>' +
      '<div><div class="cell-strong" style="font-size:17px">' + esc(name) + '</div>' +
      '<div class="cell-sub" style="font-size:13px">' + esc(info.email || '') + '</div>' +
      '<span class="badge violet" style="margin-top:6px">' + esc(role) + '</span></div></div>' +
      '<dl class="kv">' +
      '<dt>Admin ID</dt><dd class="mono">' + esc(info._id || '—') + '</dd>' +
      '<dt>Role</dt><dd>' + esc(role) + '</dd>' +
      '</dl>' +
      '<p class="cell-sub" style="margin-top:14px;font-size:12px">Profile authentication is active for this session.</p>' +
      '</div></div>' +

      // session + system
      '<div style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="panel"><div class="panel-head"><h3>' + icon('shield') + 'Session</h3></div>' +
      '<div class="panel-pad">' +
      '<p class="cell-sub" style="font-size:13px;margin-bottom:16px">You are signed in. Sessions last 30 days; sign out to end this one on this device.</p>' +
      '<button class="btn danger" id="logoutBtn">' + icon('log-out') + 'Sign out</button>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-head"><h3>' + icon('command') + 'System</h3></div>' +
      '<div class="panel-pad"><dl class="kv">' +
      '<dt>Console</dt><dd>Chromora Command Center</dd>' +
      '<dt>API base</dt><dd class="mono">' + esc(CC.API.base) + '</dd>' +
      '<dt>Build</dt><dd>Buildless · Luxury Engine v1</dd>' +
      '</dl></div></div>' +
      '</div>' +
      '</div>' +

      // Dedicated Store "From Address" Panel for Invoices & Dispatch Slips
      '<div class="panel" style="margin-bottom:20px">' +
      '<div class="panel-head">' +
      '<h3>' + icon('map-pin') + 'Dispatch / Store "From Address"</h3>' +
      '<span class="badge ok"><i class="d"></i>Shipping &amp; Invoices</span>' +
      '</div>' +
      '<div class="panel-pad">' +
      '<p class="cell-sub" style="font-size:13px;margin-bottom:18px;max-width:700px">' +
      'Configure the return and sender address for your store. This simple <b>From Address</b> will be printed on <b>Order Slips (courier package stickers)</b> and <b>Customer Invoices</b>.' +
      '</p>' +

      '<div style="display:flex;flex-direction:column;gap:14px;max-width:680px">' +
      '<div class="grid grid-2" style="gap:14px">' +
      '<div class="field"><label>Store / Sender Name</label>' +
      '<input class="input" id="faStoreName" value="' + esc(fromSettings.storeName || '') + '" placeholder="e.g. CHROMORA"></div>' +
      '<div class="field"><label>Contact / Dispatch Phone</label>' +
      '<input class="input" id="faPhone" value="' + esc(fromSettings.phone || '') + '" placeholder="e.g. +91 9400 123 456"></div>' +
      '</div>' +

      '<div class="field"><label>Dispatch / From Address</label>' +
      '<textarea class="input" id="faAddress" rows="3" style="min-height:85px;line-height:1.5" placeholder="Enter complete dispatch address (Street, City, State, PIN, Country)">' + esc(fromSettings.address || '') + '</textarea>' +
      '<span class="hint">Type your full address to appear as the sender on shipping labels and invoices.</span></div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:14px;border-top:1px solid var(--line-soft);flex-wrap:wrap">' +
      '<button class="btn primary" id="btnSaveFromAddress">' + icon('check') + 'Save From Address</button>' +
      '<button class="btn ghost" id="btnResetFromAddress" style="color:var(--ink-3)">' + icon('refresh') + 'Reset Defaults</button>' +
      '</div>' +
      '</div>' +

      '</div></div>' +

      // Team Management (super admin only)
      (isSuper ?
        '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>' + icon('users') + 'Add team member</h3>' +
        '<span class="badge violet">Super admin</span></div>' +
        '<div class="panel-pad">' +
        '<div class="grid grid-2" style="gap:14px">' +
        '<div class="field"><label>Name</label><input class="input" id="tmName" placeholder="Full name"></div>' +
        '<div class="field"><label>Email</label><input class="input" id="tmEmail" type="email" placeholder="name@chromora.in"></div>' +
        '<div class="field"><label>Password</label><input class="input" id="tmPass" type="password" placeholder="Min 6 characters"></div>' +
        '<div class="field"><label>Role</label><select class="select" id="tmRole">' +
        '<option value="admin">Admin</option><option value="super admin">Super admin</option></select></div>' +
        '</div>' +
        '<button class="btn primary" id="addMember" style="margin-top:16px">' + icon('plus') + 'Create member</button>' +
        '</div></div>' : '');

    // Save button click
    root.querySelector('#btnSaveFromAddress').addEventListener('click', function () {
      var storeName = (root.querySelector('#faStoreName').value || '').trim();
      var phone = (root.querySelector('#faPhone').value || '').trim();
      var address = (root.querySelector('#faAddress').value || '').trim();

      if (!storeName) {
        CC.toast('Store / Sender name is required', 'bad');
        return;
      }
      if (!address) {
        CC.toast('From Address is required', 'bad');
        return;
      }

      var btn = root.querySelector('#btnSaveFromAddress');
      btn.disabled = true;

      try {
        if (global.Invoice && global.Invoice.saveFromSettings) {
          global.Invoice.saveFromSettings({
            storeName: storeName,
            phone: phone,
            address: address
          });
        }
        CC.toast('From Address saved! All order slips & invoices will use this address.', 'ok');
      } catch (e) {
        CC.toast('Failed to save settings: ' + e.message, 'bad');
      } finally {
        setTimeout(function () { btn.disabled = false; }, 400);
      }
    });

    // Reset to defaults click
    root.querySelector('#btnResetFromAddress').addEventListener('click', function () {
      CC.confirmModal({
        title: 'Reset From Address?',
        body: 'This will revert the dispatch From Address to original factory defaults.',
        ok: 'Reset',
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        if (global.Invoice && global.Invoice.resetFromSettings) {
          var def = global.Invoice.resetFromSettings();
          root.querySelector('#faStoreName').value = def.storeName || '';
          root.querySelector('#faPhone').value = def.phone || '';
          root.querySelector('#faAddress').value = def.address || '';
          CC.toast('From Address reset to factory defaults.', 'ok');
        }
      });
    });

    // Sign out button click
    root.querySelector('#logoutBtn').addEventListener('click', function () {
      CC.confirmModal({
        title: 'Sign out?',
        body: 'You will need to sign in again to access the console.',
        ok: 'Sign out',
        danger: true
      }).then(function (ok) {
        if (ok) global.App.logout();
      });
    });

    // Super admin add member
    if (isSuper) {
      root.querySelector('#addMember').addEventListener('click', function () {
        var tmName = root.querySelector('#tmName').value.trim();
        var tmEmail = root.querySelector('#tmEmail').value.trim();
        var tmPassword = root.querySelector('#tmPass').value;
        var roleVal = root.querySelector('#tmRole').value;
        if (tmName.length < 2) { CC.toast('Name must be at least 2 characters', 'bad'); return; }
        if (!/^\S+@\S+\.\S+$/.test(tmEmail)) { CC.toast('Enter a valid email', 'bad'); return; }
        if (tmPassword.length < 6) { CC.toast('Password must be at least 6 characters', 'bad'); return; }
        var btn = root.querySelector('#addMember'); btn.disabled = true;
        CC.API.post('/admin/register', { name: tmName, email: tmEmail, password: tmPassword, role: roleVal })
          .then(function () {
            CC.toast('Team member created');
            root.querySelector('#tmName').value = '';
            root.querySelector('#tmEmail').value = '';
            root.querySelector('#tmPass').value = '';
          }).catch(function (e) { CC.toast(e.message, 'bad'); })
          .then(function () { btn.disabled = false; });
      });
    }
  }

  global.Views.settings = { title: 'Settings', crumb: 'Settings', render: render };
})(window);
