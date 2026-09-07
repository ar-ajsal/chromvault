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
          storeName: 'CHROMVAULT',
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
      '<dt>Console</dt><dd>Chromvault Command Center</dd>' +
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
      '<input class="input" id="faStoreName" value="' + esc(fromSettings.storeName || '') + '" placeholder="e.g. CHROMVAULT"></div>' +
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

      // Hero Media Panel
      '<div class="panel" style="margin-bottom:20px">' +
      '<div class="panel-head">' +
      '<h3>' + icon('image') + 'Storefront Hero Media</h3>' +
      '</div>' +
      '<div class="panel-pad">' +
      '<p class="cell-sub" style="font-size:13px;margin-bottom:18px;">' +
      'Upload a video (.mp4, .webm) or an image (.jpg, .png, .webp) for the homepage hero section. (Max 10MB)' +
      '</p>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
      '<input type="file" id="heroMediaInput" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" style="display:none">' +
      '<button class="btn ghost" onclick="document.getElementById(\'heroMediaInput\').click()">' + icon('upload') + 'Choose File</button>' +
      '<span id="heroMediaName" class="cell-sub" style="font-size:13px">No file chosen</span>' +
      '</div>' +
      '<button class="btn primary" id="btnUploadHeroMedia" disabled>' + icon('check') + 'Upload & Save</button>' +
      '</div></div>' +

      // Push Notifications Panel
      '<div class="panel" style="margin-bottom:20px">' +
      '<div class="panel-head">' +
      '<h3>' + icon('bell') + 'Push Notifications &amp; Order Alerts</h3>' +
      '<span id="notifStatusBadge" class="badge neutral"><i class="d"></i>Checking…</span>' +
      '</div>' +
      '<div class="panel-pad">' +
      '<p class="cell-sub" style="font-size:13px;margin-bottom:18px;max-width:700px">' +
      'Receive instant real-time alerts when customers place new orders. When active, hear an order chime; when minimized or backgrounded, receive system push notifications.' +
      '</p>' +

      '<div style="display:flex;flex-direction:column;gap:16px;max-width:680px">' +

      // Main Switch Row
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--near-black);border:1px solid var(--line-soft);border-radius:var(--r-md);flex-wrap:wrap;gap:12px">' +
      '<div>' +
      '<div class="cell-strong" style="font-size:14px">Device Push Notifications</div>' +
      '<div class="cell-sub" id="notifStatusDesc" style="font-size:12px;margin-top:2px">Configure this browser to receive real-time order alerts</div>' +
      '</div>' +
      '<button class="btn primary" id="btnToggleNotifications">' + icon('zap') + 'Enable Notifications</button>' +
      '</div>' +

      // Controls Grid (Order Alerts & Sound)
      '<div class="grid grid-2" style="gap:14px">' +
      // Order Alerts Toggle
      '<div style="padding:14px;background:var(--near-black);border:1px solid var(--line-soft);border-radius:var(--r-md)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      '<label class="cell-strong" style="font-size:13px;cursor:pointer" for="chkOrderAlerts">Order Popup Alerts</label>' +
      '<input type="checkbox" id="chkOrderAlerts" style="width:18px;height:18px;cursor:pointer"' + ((global.Notifications && global.Notifications.isOrderAlertsEnabled()) ? ' checked' : '') + '>' +
      '</div>' +
      '<div class="cell-sub" style="font-size:12px">Show visual popup banner when new orders arrive</div>' +
      '</div>' +

      // Sound Toggle & Volume
      '<div style="padding:14px;background:var(--near-black);border:1px solid var(--line-soft);border-radius:var(--r-md)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
      '<label class="cell-strong" style="font-size:13px;cursor:pointer" for="chkSoundAlerts">Order Chime Sound</label>' +
      '<input type="checkbox" id="chkSoundAlerts" style="width:18px;height:18px;cursor:pointer"' + ((global.Notifications && global.Notifications.isSoundEnabled()) ? ' checked' : '') + '>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
      '<span class="cell-sub" style="font-size:11px">Volume</span>' +
      '<input type="range" id="rngVolume" min="0" max="1" step="0.05" value="' + (global.Notifications ? global.Notifications.getSoundVolume() : 0.8) + '" style="flex:1;cursor:pointer">' +
      '</div>' +
      '</div>' +
      '</div>' +

      // Action Buttons (Test Notification & Test Sound)
      '<div style="display:flex;align-items:center;gap:12px;padding-top:4px;flex-wrap:wrap">' +
      '<button class="btn ghost" id="btnTestNotif">' + icon('bell') + 'Test Notification</button>' +
      '<button class="btn ghost" id="btnTestSound">' + icon('volume') + 'Test Sound</button>' +
      '</div>' +

      '</div></div></div>' +

      // Storefront URL Panel
      '<div class="panel" style="margin-bottom:20px">' +
      '<div class="panel-head">' +
      '<h3>' + icon('external') + 'Storefront Public URL</h3>' +
      '</div>' +
      '<div class="panel-pad">' +
      '<p class="cell-sub" style="font-size:13px;margin-bottom:18px;">' +
      'The public domain where customers access your storefront. Review links and customer links are generated using this URL.' +
      '</p>' +
      '<div class="field" style="max-width:520px">' +
      '<label>Storefront Base URL</label>' +
      '<input class="input mono" id="sfPublicUrl" value="' + esc(CC.getStorefrontUrl()) + '" placeholder="e.g. http://localhost:3001 or https://chromvault.vercel.app">' +
      '<span class="hint">Currently active: <code>' + esc(CC.getStorefrontUrl()) + '</code></span>' +
      '</div>' +
      '<div style="display:flex;gap:12px;margin-top:14px">' +
      '<button class="btn primary" id="btnSaveStorefrontUrl">' + icon('check') + 'Save Storefront URL</button>' +
      '<button class="btn ghost" id="btnResetStorefrontUrl" style="color:var(--ink-3)">' + icon('refresh') + 'Auto-Detect</button>' +
      '</div>' +
      '</div></div>' +

      // Team Management (super admin only)
      (isSuper ?
        '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>' + icon('users') + 'Add team member</h3>' +
        '<span class="badge violet">Super admin</span></div>' +
        '<div class="panel-pad">' +
        '<div class="grid grid-2" style="gap:14px">' +
        '<div class="field"><label>Name</label><input class="input" id="tmName" placeholder="Full name"></div>' +
        '<div class="field"><label>Email</label><input class="input" id="tmEmail" type="email" placeholder="name@chromvault.in"></div>' +
        '<div class="field"><label>Password</label><input class="input" id="tmPass" type="password" placeholder="Min 6 characters"></div>' +
        '<div class="field"><label>Role</label><select class="select" id="tmRole">' +
        '<option value="admin">Admin</option><option value="super admin">Super admin</option></select></div>' +
        '</div>' +
        '<button class="btn primary" id="addMember" style="margin-top:16px">' + icon('plus') + 'Create member</button>' +
        '</div></div>' : '');

    // Save button click
    var btnSaveFA = root.querySelector('#btnSaveFromAddress');
    if (btnSaveFA) {
      btnSaveFA.addEventListener('click', function () {
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

        btnSaveFA.disabled = true;

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
          setTimeout(function () { btnSaveFA.disabled = false; }, 400);
        }
      });
    }

    // Reset to defaults click
    var btnResetFA = root.querySelector('#btnResetFromAddress');
    if (btnResetFA) {
      btnResetFA.addEventListener('click', function () {
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
    }

    // Hero Media Upload logic
    var heroInput = root.querySelector('#heroMediaInput');
    var heroName = root.querySelector('#heroMediaName');
    var heroBtn = root.querySelector('#btnUploadHeroMedia');
    if (heroInput && heroBtn) {
      heroInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
          heroName.textContent = this.files[0].name;
          heroBtn.disabled = false;
        } else {
          heroName.textContent = 'No file chosen';
          heroBtn.disabled = true;
        }
      });
      heroBtn.addEventListener('click', function () {
        var file = heroInput.files[0];
        if (!file) return;
        heroBtn.disabled = true;
        heroBtn.innerHTML = UI.spinner() + ' Uploading...';
        
        CC.API.upload(file)
          .then(function (url) {
            return CC.API.put('/settings/hero_media', { value: url });
          })
          .then(function () {
            CC.toast('Hero media updated successfully!', 'ok');
            heroName.textContent = 'Live on storefront';
            heroInput.value = '';
          })
          .catch(function (e) {
            CC.toast(e.message || 'Upload failed', 'bad');
          })
          .then(function () {
            heroBtn.disabled = true;
            heroBtn.innerHTML = icon('check') + 'Upload & Save';
          });
      });
    }

    // Storefront URL logic
    var btnSaveSf = root.querySelector('#btnSaveStorefrontUrl');
    var btnResetSf = root.querySelector('#btnResetStorefrontUrl');
    var sfInput = root.querySelector('#sfPublicUrl');
    if (btnSaveSf && sfInput) {
      btnSaveSf.addEventListener('click', function () {
        var val = (sfInput.value || '').trim();
        if (!val) {
          localStorage.removeItem('chromvault_storefront_url');
          sfInput.value = CC.getStorefrontUrl();
          CC.toast('Storefront URL set to auto-detect: ' + CC.getStorefrontUrl(), 'ok');
        } else {
          localStorage.setItem('chromvault_storefront_url', val.replace(/\/+$/, ''));
          CC.toast('Storefront URL saved!', 'ok');
        }
      });
      if (btnResetSf) {
        btnResetSf.addEventListener('click', function () {
          localStorage.removeItem('chromvault_storefront_url');
          sfInput.value = CC.getStorefrontUrl();
          CC.toast('Reverted to auto-detected URL: ' + sfInput.value, 'ok');
        });
      }
    }

    // Push Notifications logic
    var btnToggleNotif = root.querySelector('#btnToggleNotifications');
    var badgeNotif = root.querySelector('#notifStatusBadge');
    var descNotif = root.querySelector('#notifStatusDesc');
    var chkAlerts = root.querySelector('#chkOrderAlerts');
    var chkSound = root.querySelector('#chkSoundAlerts');
    var rngVol = root.querySelector('#rngVolume');
    var btnTestN = root.querySelector('#btnTestNotif');
    var btnTestS = root.querySelector('#btnTestSound');

    function updateNotifUI() {
      if (!global.Notifications) return;
      var status = global.Notifications.getPermissionStatus();
      var enabled = global.Notifications.isEnabled();

      if (status === 'granted' && enabled) {
        badgeNotif.className = 'badge ok';
        badgeNotif.innerHTML = '<i class="d"></i>Notifications active';
        descNotif.textContent = 'This device is actively registered for real-time order alerts.';
        btnToggleNotif.innerHTML = icon('check') + 'Active (Re-register)';
        btnToggleNotif.className = 'btn ghost';
      } else if (status === 'granted') {
        badgeNotif.className = 'badge ok';
        badgeNotif.innerHTML = '<i class="d"></i>Permission granted';
        descNotif.textContent = 'Browser permission granted. Click below to register this device.';
        btnToggleNotif.innerHTML = icon('zap') + 'Register Device';
        btnToggleNotif.className = 'btn primary';
      } else if (status === 'denied') {
        badgeNotif.className = 'badge bad';
        badgeNotif.innerHTML = '<i class="d"></i>Notifications blocked';
        descNotif.textContent = 'Notifications are blocked. Click the lock/site settings in your address bar to allow.';
        btnToggleNotif.innerHTML = icon('alert') + 'Blocked by Browser';
        btnToggleNotif.className = 'btn ghost';
        btnToggleNotif.disabled = true;
      } else {
        badgeNotif.className = 'badge neutral';
        badgeNotif.innerHTML = '<i class="d"></i>Not enabled';
        descNotif.textContent = 'Click below to allow instant order notifications on this browser.';
        btnToggleNotif.innerHTML = icon('zap') + 'Enable Notifications';
        btnToggleNotif.className = 'btn primary';
      }
    }

    if (btnToggleNotif) {
      btnToggleNotif.addEventListener('click', function () {
        btnToggleNotif.disabled = true;
        btnToggleNotif.innerHTML = UI.spinner() + ' Requesting…';

        global.Notifications.enable()
          .then(function () {
            updateNotifUI();
            CC.toast('Push notifications enabled for this device!', 'ok');
          })
          .catch(function (err) {
            updateNotifUI();
            CC.toast(err.message || 'Could not enable notifications', 'bad');
          })
          .then(function () {
            btnToggleNotif.disabled = false;
          });
      });
    }

    if (chkAlerts) {
      chkAlerts.addEventListener('change', function () {
        global.Notifications.setOrderAlertsEnabled(this.checked);
        CC.toast('Order alerts ' + (this.checked ? 'enabled' : 'disabled'), 'ok');
      });
    }

    if (chkSound) {
      chkSound.addEventListener('change', function () {
        global.Notifications.setSoundEnabled(this.checked);
        CC.toast('Order chime ' + (this.checked ? 'enabled' : 'disabled'), 'ok');
      });
    }

    if (rngVol) {
      rngVol.addEventListener('input', function () {
        global.Notifications.setSoundVolume(this.value);
      });
    }

    if (btnTestS) {
      btnTestS.addEventListener('click', function () {
        global.Notifications.testSound();
        CC.toast('Playing test order chime…', 'ok');
      });
    }

    if (btnTestN) {
      btnTestN.addEventListener('click', function () {
        btnTestN.disabled = true;
        var prev = btnTestN.innerHTML;
        btnTestN.innerHTML = UI.spinner() + ' Sending…';

        // Play active alert immediately in active session for testing
        global.Notifications.playOrderSound();

        global.Notifications.test()
          .then(function (res) {
            CC.toast('Test notification dispatched! Check your notifications.', 'ok');
          })
          .catch(function (err) {
            CC.toast(err.message || 'Test push notification failed', 'bad');
          })
          .then(function () {
            btnTestN.disabled = false;
            btnTestN.innerHTML = prev;
          });
      });
    }

    updateNotifUI();

    // Sign out button click
    var logoutBtn = root.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        CC.confirmModal({
          title: 'Sign out?',
          body: 'You will need to sign in again to access the console.',
          ok: 'Sign out',
          danger: true
        }).then(function (ok) {
          if (ok) global.App.logout();
        });
      });
    }

    // Super admin add member
    if (isSuper) {
      var addMemberBtn = root.querySelector('#addMember');
      if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function () {
          var tmName = (root.querySelector('#tmName') ? root.querySelector('#tmName').value : '').trim();
          var tmEmail = (root.querySelector('#tmEmail') ? root.querySelector('#tmEmail').value : '').trim();
          var tmPassword = root.querySelector('#tmPass') ? root.querySelector('#tmPass').value : '';
          var roleVal = root.querySelector('#tmRole') ? root.querySelector('#tmRole').value : 'admin';
          if (tmName.length < 2) { CC.toast('Name must be at least 2 characters', 'bad'); return; }
          if (!/^\S+@\S+\.\S+$/.test(tmEmail)) { CC.toast('Enter a valid email', 'bad'); return; }
          if (tmPassword.length < 6) { CC.toast('Password must be at least 6 characters', 'bad'); return; }
          addMemberBtn.disabled = true;
          CC.API.post('/admin/register', { name: tmName, email: tmEmail, password: tmPassword, role: roleVal })
            .then(function () {
              CC.toast('Team member created');
              if (root.querySelector('#tmName')) root.querySelector('#tmName').value = '';
              if (root.querySelector('#tmEmail')) root.querySelector('#tmEmail').value = '';
              if (root.querySelector('#tmPass')) root.querySelector('#tmPass').value = '';
            }).catch(function (e) { CC.toast(e.message, 'bad'); })
            .then(function () { addMemberBtn.disabled = false; });
        });
      }
    }
  }

  global.Views.settings = { title: 'Settings', crumb: 'Settings', render: render };
})(window);
