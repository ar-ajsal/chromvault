/* ============================================================================
   View: Reviews — list of reviews pending moderation, and approved/rejected
   API:
     GET  /reviews/admin?status=
     PUT  /reviews/:id/moderate
   ========================================================================== */
(function (global) {
  'use strict';
  global.Views = global.Views || {};
  var CC = global.CC, UI = global.UI, icon = global.icon;
  var esc = CC.esc, locName = CC.locName;

  var currentStatus = 'pending_moderation';

  function render(root) {
    root.innerHTML =
      '<div class="page-head">' +
      '<div><div class="eyebrow">Catalog</div><h1>Reviews</h1>' +
      '<div class="sub" id="revSub">Loading…</div></div>' +
      '</div>' +
      '<div class="toolbar">' +
      '<select class="select" id="revStatus">' +
      '<option value="pending_moderation" selected>Pending Moderation</option>' +
      '<option value="approved">Approved</option>' +
      '<option value="rejected">Rejected</option>' +
      '</select>' +
      '</div>' +
      '<div id="revContainer">' + UI.spinner() + '</div>';

    root.querySelector('#revStatus').addEventListener('change', function () {
      currentStatus = this.value;
      load(root);
    });

    load(root);
  }

  function load(root) {
    var box = root.querySelector('#revContainer');
    box.innerHTML = UI.spinner();
    CC.API.get('/reviews/admin?status=' + currentStatus).then(function (d) {
      var reviews = (d && d.reviews) || [];
      root.querySelector('#revSub').textContent = CC.num(reviews.length) + ' review' + (reviews.length === 1 ? '' : 's');
      
      if (!reviews.length) {
        box.innerHTML = UI.emptyState({ 
            icon: 'star', 
            title: 'No reviews found', 
            body: 'No reviews match this status.'
        });
        return;
      }
      
      box.innerHTML = '<div class="grid grid-3">' + reviews.map(function (r) {
        var imgUrl = (r.productId && r.productId.image && r.productId.image[0]) ? r.productId.image[0] : '';
        var productName = r.productId ? locName(r.productId.title) : 'Unknown Product';
        var customerName = r.orderId ? r.orderId.customerName : 'Unknown Customer';
        
        var stars = '';
        for (var i = 1; i <= 5; i++) {
          stars += '<span style="color:' + (i <= r.rating ? '#FFD700' : 'var(--line)') + '">' + icon('star') + '</span>';
        }

        return '<div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            (imgUrl ? '<img src="' + esc(imgUrl) + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover">' : '<div class="thumb-ph" style="width:40px;height:40px;border-radius:6px"></div>') +
            '<div style="flex:1;min-width:0">' +
              '<div class="cell-strong" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(productName) + '</div>' +
              '<div class="cell-sub" style="font-size:11px">By ' + esc(customerName) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex">' + stars + '</div>' +
          '<div style="font-size:13px;color:var(--ink-2);background:var(--bg-card);padding:10px;border-radius:8px;line-height:1.4">"' + esc(r.text) + '"</div>' +
          (currentStatus === 'pending_moderation' ? 
            '<div style="display:flex;gap:8px;margin-top:auto">' +
              '<button class="btn sm ghost danger grow btn-reject" data-id="' + esc(r._id) + '">' + icon('x') + 'Reject</button>' +
              '<button class="btn sm ok grow btn-approve" data-id="' + esc(r._id) + '">' + icon('check') + 'Approve</button>' +
            '</div>' 
            : 
            '<div class="cell-sub" style="margin-top:auto;text-align:right">Status: ' + esc(r.status) + '</div>'
          ) +
        '</div>';
      }).join('') + '</div>';

      box.querySelectorAll('.btn-approve').forEach(function (btn) {
        btn.addEventListener('click', function () {
          moderate(root, btn.getAttribute('data-id'), 'approved');
        });
      });

      box.querySelectorAll('.btn-reject').forEach(function (btn) {
        btn.addEventListener('click', function () {
          moderate(root, btn.getAttribute('data-id'), 'rejected');
        });
      });

    }).catch(function (e) {
      box.innerHTML = UI.errorState(e.message, 'revRetry');
      var rt = box.querySelector('#revRetry'); if (rt) rt.addEventListener('click', function () { load(root); });
    });
  }

  function moderate(root, id, status) {
    CC.API.put('/reviews/' + id + '/moderate', { status: status }).then(function () {
      CC.toast('Review ' + status, 'ok');
      load(root);
    }).catch(function (err) {
      CC.toast(err.message || 'Failed to moderate review', 'bad');
    });
  }

  global.Views.reviews = { title: 'Reviews', crumb: 'Reviews', render: render };
})(window);
