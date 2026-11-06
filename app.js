/* Медиакоми — игровая логика */
(function () {
  'use strict';

  var ROUNDS = 10;
  var STEP = 10000;

  var app = document.getElementById('app');
  var rounds = [];
  var current = 0;
  var results = []; // {guess, price, diff, points}

  /* ---------- Утилиты ---------- */

  function fmt(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startGame() {
    rounds = shuffle(LOTS).slice(0, ROUNDS);
    results = [];
    current = 0;
    renderRound();
  }

  /* ---------- Баллы ---------- */

  function calcPoints(guess, price) {
    var err = Math.abs(guess - price) / price;
    if (err <= 0.05) return 100;
    if (err <= 0.10) return 80;
    if (err <= 0.15) return 60;
    if (err <= 0.25) return 40;
    if (err <= 0.40) return 20;
    return 0;
  }

  function archetype() {
    var sumGuess = 0, sumPrice = 0;
    results.forEach(function (r) {
      sumGuess += r.guess;
      sumPrice += r.price;
    });
    var bias = (sumGuess - sumPrice) / sumPrice;
    if (bias <= -0.10) {
      return {
        emoji: '🧑‍🎓',
        title: 'Жадный студент',
        desc: 'Вы почти всегда называли цену ниже реальной. Квартиры в Коми дешевле, чем вы думали!'
      };
    }
    if (bias >= 0.10) {
      return {
        emoji: '💸',
        title: 'Транжира',
        desc: 'Ваши оценки в основном выше реальных цен. Рынок Коми умеет удивлять.'
      };
    }
    return {
      emoji: '🏠',
      title: 'Адекватный квартирант',
      desc: 'Ваши оценки в целом совпали с рынком. Чувство цены у вас есть!'
    };
  }

  /* ---------- Бегунок ---------- */

  function sliderBounds(price) {
    var min = Math.max(0, Math.floor(price * 0.3 / STEP) * STEP);
    var max = Math.ceil(price * 1.8 / STEP) * STEP;
    return { min: min, max: max };
  }

  /* ---------- Экраны ---------- */

  function renderStart() {
    app.innerHTML =
      '<div class="screen start">' +
        '<div class="brand">' +
          '<div class="brand__mark">Му</div>' +
          '<div><div class="brand__name">Медиакоми</div>' +
          '<div class="brand__tag">Угадай цену квартиры в Коми</div></div>' +
        '</div>' +
        '<div class="start__rules">' +
          '<div class="rule"><div class="rule__num">1</div><div class="rule__text">Смотрите фото квартиры — <b>' + ROUNDS + ' раундов</b>, по одной квартире за раз.</div></div>' +
          '<div class="rule"><div class="rule__num">2</div><div class="rule__text">Двигайте бегунок и называйте цену, затем жмите <b>«Оценить»</b>.</div></div>' +
          '<div class="rule"><div class="rule__num">3</div><div class="rule__text">Чем ближе ваша цена к реальной — тем больше баллов. Максимум — <b>1000</b>.</div></div>' +
        '</div>' +
        '<button class="btn btn--light" id="btn-start">Запустить игру</button>' +
      '</div>';
    document.getElementById('btn-start').addEventListener('click', startGame);
  }

  function renderRound() {
    var lot = rounds[current];
    var b = sliderBounds(lot.price);
    var startVal = Math.round((b.min + b.max) / 2 / STEP) * STEP;
    var score = results.reduce(function (s, r) { return s + r.points; }, 0);

    // предзагрузка первого фото следующего лота
    var preload = document.getElementById('preload-next');
    if (rounds[current + 1]) preload.href = rounds[current + 1].photos[0];

    app.innerHTML =
      '<div class="progress">' +
        '<div class="progress__row">' +
          '<div class="progress__label">Квартира ' + (current + 1) + ' / ' + ROUNDS + '</div>' +
          '<div class="progress__score">' + score + ' балл.</div>' +
        '</div>' +
        '<div class="progress__bar"><div class="progress__fill" style="width:' + (current / ROUNDS * 100) + '%"></div></div>' +
      '</div>' +
      '<div class="screen">' +
        '<div class="card">' +
          '<div class="gallery" id="gallery">' +
            lot.photos.map(function (p, i) {
              return '<div class="gallery__item"><img src="' + p + '" alt="Фото ' + (i + 1) + '"' +
                (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '></div>';
            }).join('') +
          '</div>' +
          '<div class="dots" id="dots">' +
            lot.photos.map(function (_, i) {
              return '<span class="dots__dot' + (i === 0 ? ' dots__dot--active' : '') + '"></span>';
            }).join('') +
          '</div>' +
          '<div class="lot-info">' +
            '<div class="lot-info__street">' + esc(lot.street) + '</div>' +
            '<div class="lot-info__desc">' + esc(lot.desc) + '</div>' +
          '</div>' +
          '<div class="guess">' +
            '<div class="guess__value" id="guess-value">' + fmt(startVal) + '</div>' +
            '<div class="guess__hint">Ваша оценка стоимости</div>' +
            '<input type="range" id="guess" min="' + b.min + '" max="' + b.max + '" step="' + STEP + '" value="' + startVal + '">' +
            '<div class="guess__range"><span>' + fmt(b.min) + '</span><span>' + fmt(b.max) + '</span></div>' +
            '<button class="btn btn--primary" id="btn-submit">Оценить</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    setupGallery();
    setupSlider(lot);
    document.getElementById('btn-submit').addEventListener('click', function () {
      var guess = parseInt(document.getElementById('guess').value, 10);
      submitGuess(lot, guess);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setupGallery() {
    var gallery = document.getElementById('gallery');
    var dots = document.getElementById('dots').children;
    var idx = 0;
    gallery.addEventListener('scroll', function () {
      var i = Math.round(gallery.scrollLeft / gallery.clientWidth);
      if (i !== idx && i >= 0 && i < dots.length) {
        dots[idx].classList.remove('dots__dot--active');
        dots[i].classList.add('dots__dot--active');
        idx = i;
      }
    }, { passive: true });
  }

  function setupSlider(lot) {
    var input = document.getElementById('guess');
    var valueEl = document.getElementById('guess-value');
    function update() {
      var pct = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--pct', pct + '%');
      valueEl.textContent = fmt(parseInt(input.value, 10));
    }
    input.addEventListener('input', update);
    update();
  }

  /* ---------- Результат раунда ---------- */

  function submitGuess(lot, guess) {
    var price = lot.price;
    var diff = guess - price;
    var points = calcPoints(guess, price);
    results.push({ guess: guess, price: price, diff: diff, points: points });

    var pctDiff = Math.round(Math.abs(diff) / price * 100);
    var diffText = diff === 0 ? 'Точно!' : (diff > 0 ? '+' : '−') + fmt(Math.abs(diff)).replace(' ₽', ' ₽');
    var diffPct = diff === 0 ? '' : ' (' + pctDiff + '%)';
    var diffClass = diff === 0 ? 'diff--exact' : (diff > 0 ? 'diff--over' : 'diff--under');
    var diffWord = diff > 0 ? 'выше реальной' : (diff < 0 ? 'ниже реальной' : '');

    var fill = document.querySelector('.progress__fill');
    if (fill) fill.style.width = ((current + 1) / ROUNDS * 100) + '%';

    app.innerHTML =
      '<div class="progress">' +
        '<div class="progress__row">' +
          '<div class="progress__label">Квартира ' + (current + 1) + ' / ' + ROUNDS + '</div>' +
          '<div class="progress__score">' + results.reduce(function (s, r) { return s + r.points; }, 0) + ' балл.</div>' +
        '</div>' +
        '<div class="progress__bar"><div class="progress__fill" style="width:' + ((current + 1) / ROUNDS * 100) + '%"></div></div>' +
      '</div>' +
      '<div class="screen">' +
        '<div class="card result">' +
          '<div><div class="result__points">+' + points + '</div>' +
          '<div class="result__points-label">баллов из 100</div></div>' +
          '<div><div class="result__hint" style="font-size:13px;color:var(--muted)">Реальная цена</div>' +
          '<div class="result__real">' + fmt(price) + '</div></div>' +
          '<div class="result__rows">' +
            '<div class="result__row"><span>Ваша цена</span><span>' + fmt(guess) + '</span></div>' +
            '<div class="result__row"><span>Разница</span><span class="' + diffClass + '">' + diffText + diffPct +
              (diffWord ? ' <small>' + diffWord + '</small>' : '') + '</span></div>' +
          '</div>' +
          '<a class="btn btn--ghost" href="' + esc(lot.url) + '" target="_blank" rel="noopener">Смотреть объявление на Авито ↗</a>' +
          '<button class="btn btn--primary" id="btn-next">' +
            (current + 1 < ROUNDS ? 'Следующая квартира' : 'Итоги игры') + '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btn-next').addEventListener('click', function () {
      current++;
      if (current < ROUNDS) renderRound();
      else renderFinal();
    });
  }

  /* ---------- Итоговый экран ---------- */

  function renderFinal() {
    var total = results.reduce(function (s, r) { return s + r.points; }, 0);
    var a = archetype();

    app.innerHTML =
      '<div class="screen final">' +
        '<div class="final__archetype-emoji">' + a.emoji + '</div>' +
        '<div><div class="final__archetype">' + a.title + '</div>' +
        '<div class="final__archetype-desc">' + a.desc + '</div></div>' +
        '<div class="final__score"><div class="final__score-num">' + total + '</div>' +
        '<div class="final__score-label">баллов из ' + (ROUNDS * 100) + '</div></div>' +
        '<div class="final__rounds">' +
          results.map(function (r, i) {
            var lot = rounds[i];
            return '<div class="final__round"><span>' + (i + 1) + '. ' + esc(lot.desc) + '</span>' +
              '<span class="final__round-points">+' + r.points + '</span></div>';
          }).join('') +
        '</div>' +
        '<button class="btn btn--primary" id="btn-restart">Играть снова</button>' +
      '</div>';

    document.getElementById('btn-restart').addEventListener('click', startGame);
  }

  renderStart();
})();
