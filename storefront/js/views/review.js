/* ============================================================================
   CHROMVAULT — REVIEW SUBMISSION
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  Views.review = function () {
    var t = Router.token();
    var p = Router.params();
    var token = p.token;

    Views.setMeta('Leave a Review', 'Share your experience with Chromvault.');

    if (!token) {
      Views.mount(Views.errorHtml(new Error('Review link is invalid or missing token.')));
      return;
    }

    Views.mount(
      '<div class="wrap" style="max-width:600px;margin:60px auto">' +
        '<div id="reviewContainer">' +
          '<div style="text-align:center;padding:60px 0">' +
            '<div class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto"></div>' +
            '<div style="margin-top:16px;color:var(--ink-2)">Verifying secure link…</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    API.get('/reviews/validate/' + token).then(function (res) {
      if (Router.stale(t)) return;
      
      var container = U.$('#reviewContainer');
      var imgHtml = res.productImage ? '<img src="' + U.escAttr(res.productImage) + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover">' : '';

      container.innerHTML = 
        '<div style="text-align:center;margin-bottom:32px">' +
          '<h1 class="display t-xl">Rate your piece</h1>' +
          '<div style="margin-top:8px;color:var(--ink-2)">You are reviewing:</div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:16px">' +
            imgHtml +
            '<div style="font-weight:600;font-size:18px">' + U.esc(res.productTitle) + '</div>' +
          '</div>' +
        '</div>' +
        
        '<form id="reviewForm" style="display:flex;flex-direction:column;gap:24px">' +
          '<div class="field">' +
            '<label>Rating <span style="color:var(--bad)">*</span></label>' +
            '<div id="starContainer" style="display:flex;gap:8px;font-size:32px;cursor:pointer;color:var(--line)">' +
              '<span data-val="1">★</span><span data-val="2">★</span><span data-val="3">★</span><span data-val="4">★</span><span data-val="5">★</span>' +
            '</div>' +
            '<input type="hidden" id="ratingInput" required>' +
          '</div>' +
          
          '<div class="field">' +
            '<label>Your Review</label>' +
            '<textarea class="input" id="reviewText" placeholder="What did you think of the piece?" style="min-height:120px"></textarea>' +
          '</div>' +
          
          '<button type="submit" class="btn primary" id="submitBtn" style="height:56px;justify-content:center;font-size:16px">Submit Review</button>' +
        '</form>';

      // Star logic
      var rating = 0;
      var stars = container.querySelectorAll('#starContainer span');
      var rInput = container.querySelector('#ratingInput');
      
      function highlight(val) {
        stars.forEach(function (s, i) {
          s.style.color = (i < val) ? '#FFD700' : 'var(--line)';
        });
      }

      stars.forEach(function (s) {
        s.addEventListener('mouseover', function () { highlight(s.getAttribute('data-val')); });
        s.addEventListener('mouseout', function () { highlight(rating); });
        s.addEventListener('click', function () {
          rating = s.getAttribute('data-val');
          rInput.value = rating;
          highlight(rating);
        });
      });

      // Submit logic
      container.querySelector('#reviewForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!rating) {
          Views.toast('Please select a star rating', 'bad');
          return;
        }

        var btn = container.querySelector('#submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div> Submitting…';

        var payload = {
          rating: parseInt(rating, 10),
          text: container.querySelector('#reviewText').value.trim()
        };

        API.post('/reviews/submit/' + token, payload).then(function () {
          container.innerHTML = 
            '<div style="text-align:center;padding:60px 0">' +
              '<div style="width:64px;height:64px;border-radius:50%;background:var(--ok-glow);color:var(--ok);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 24px">✓</div>' +
              '<h2 class="display t-lg">Review Submitted</h2>' +
              '<p style="margin-top:16px;color:var(--ink-2)">Thank you for your feedback! Your review will be published shortly.</p>' +
              '<a href="/" data-nav class="btn primary" style="margin-top:32px;display:inline-flex">Return to Archive</a>' +
            '</div>';
        }).catch(function (err) {
          Views.toast(err.message || 'Failed to submit review', 'bad');
          btn.disabled = false;
          btn.textContent = 'Submit Review';
        });
      });

    }).catch(function (err) {
      if (Router.stale(t)) return;
      U.$('#reviewContainer').innerHTML = Views.errorHtml(err);
    });
  };

})();
