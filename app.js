/* Hijri Converter — Umm al-Qura via the browser's Intl calendar. Day numbers (days since 1970-01-01) avoid time-zone drift. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "hijri.v1";

  var H_EN = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'dah", "Dhu al-Hijjah"];
  var H_AR = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
  var H_EN_S = ["Muh", "Saf", "Rab I", "Rab II", "Jum I", "Jum II", "Raj", "Sha", "Ram", "Shaw", "Dhul-Q", "Dhul-H"];
  var G_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var G_AR = { intl: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    levant: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"] };
  var W_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var W_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var W_EN_S = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var W_AR_S = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  var H_MIN = 1300, H_MAX = 1600;

  // ---------- Gregorian day numbers ----------
  function dfc(y, m, d) {
    y -= m <= 2 ? 1 : 0;
    var era = Math.floor(y / 400), yoe = y - era * 400, doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
    return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
  }
  function cfd(z) {
    z += 719468;
    var era = Math.floor(z / 146097), doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
    var m = mp + (mp < 10 ? 3 : -9);
    return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m: m, d: doy - Math.floor((153 * mp + 2) / 5) + 1 };
  }
  function wd(z) { return ((z % 7) + 11) % 7; }  // 0 = Sunday
  function gdim(y, m) { return m === 2 ? (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28) : [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function iso(g) { return String(g.y).padStart(4, "0") + "-" + String(g.m).padStart(2, "0") + "-" + String(g.d).padStart(2, "0"); }
  function parseIso(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m && +m[3] <= gdim(+m[1], +m[2]) && +m[2] >= 1 && +m[2] <= 12 ? dfc(+m[1], +m[2], +m[3]) : null; }

  // ---------- Umm al-Qura through Intl ----------
  var FMT = null, CACHE = {};
  function toHijri(z) {
    if (CACHE[z]) return CACHE[z];
    FMT = FMT || new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
    var p = {};
    FMT.formatToParts(new Date(z * 86400000)).forEach(function (x) { if (/^(year|month|day)$/.test(x.type)) p[x.type] = parseInt(x.value, 10); });
    return (CACHE[z] = { y: p.year, m: p.month, d: p.day });
  }
  // Hijri -> Gregorian: estimate from the mean month, then search nearby days for the exact Umm al-Qura match.
  function fromHijri(hy, hm, hd) {
    var est = Math.round(dfc(622, 7, 19) + (hy - 1) * 354.36707 + (hm - 1) * 29.530589 + hd - 1);
    for (var k = 0; k <= 40; k++) {
      for (var s = -1; s <= 1; s += 2) {
        var h = toHijri(est + k * s);
        if (h.y === hy && h.m === hm && h.d === hd) return est + k * s;
        if (!k) break;
      }
    }
    return null;
  }
  function hStart(hy, hm) { return fromHijri(hy, hm, 1); }
  function hNext(hy, hm) { return hm === 12 ? { y: hy + 1, m: 1 } : { y: hy, m: hm + 1 }; }
  function hPrev(hy, hm) { return hm === 1 ? { y: hy - 1, m: 12 } : { y: hy, m: hm - 1 }; }
  function hdim(hy, hm) { var n = hNext(hy, hm); return hStart(n.y, n.m) - hStart(hy, hm); }

  // Age as of day zt for a birth on day zb, counted in Hijri years / months / days.
  function hijriAge(zb, zt) {
    var b = toHijri(zb), t = toHijri(zt), y = t.y - b.y, m = t.m - b.m, d = t.d - b.d;
    if (d < 0) { m--; var p = hPrev(t.y, t.m); d += hdim(p.y, p.m); }
    if (m < 0) { y--; m += 12; }
    // next Hijri birthday on or after zt (a 30th falls back to the 29th in a short month)
    var ny = t.y, nz;
    for (var i = 0; i < 2; i++, ny++) {
      nz = fromHijri(ny, b.m, Math.min(b.d, hdim(ny, b.m)));
      if (nz != null && nz >= zt) break;
    }
    return { y: y, m: m, d: d, days: zt - zb, next: nz };
  }

  // ---------- formatting ----------
  var st = { z: null, today: null, week: 6, gm: "intl", dg: "ar", dob: "" };
  function A(n) { var s = String(n); return st.dg === "ar" ? s.replace(/\d/g, function (c) { return "٠١٢٣٤٥٦٧٨٩"[c]; }) : s; }
  function hEn(z) { var h = toHijri(z); return h.d + " " + H_EN[h.m - 1] + " " + h.y + " AH"; }
  function hAr(z) { var h = toHijri(z); return A(h.d) + " " + H_AR[h.m - 1] + " " + A(h.y) + " هـ"; }
  function gEn(z) { var g = cfd(z); return g.d + " " + G_EN[g.m - 1] + " " + g.y; }
  function gAr(z) { var g = cfd(z); return A(g.d) + " " + G_AR[st.gm][g.m - 1] + " " + A(g.y) + " م"; }
  function inRange(z) { var h = toHijri(z); return h.y >= H_MIN && h.y <= H_MAX; }
  function num(v) {
    v = String(v == null ? "" : v).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; }).replace(/\s/g, "");
    return /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
  }
  function el(tag, cls, text, attrs) { var a = attrs || {}; if (cls) a["class"] = cls; if (text != null) a.text = text; return S3.h(tag, a); }

  function result(box, lines) {
    box.innerHTML = "";
    lines.forEach(function (l) { box.appendChild(el(l[0], l[1], l[2], l[3])); });
  }

  // ---------- render ----------
  function renderToday() {
    var z = st.today;
    $("#t-ar").textContent = W_AR[wd(z)] + " " + hAr(z);
    $("#t-en").textContent = W_EN[wd(z)] + ", " + hEn(z);
    $("#t-g").textContent = W_EN[wd(z)] + ", " + gEn(z);
    $("#t-g-ar").textContent = W_AR[wd(z)] + " " + gAr(z);
  }

  function renderConverters() {
    var z = st.z, h = toHijri(z), warn = !inRange(z);
    result($("#g-res"), [
      ["b", "hc-r-ar", W_AR[wd(z)] + " " + hAr(z), { lang: "ar", dir: "rtl" }],
      ["span", "hc-r-en", W_EN[wd(z)] + ", " + hEn(z)],
      ["span", "hc-r-mono mono", h.y + "-" + String(h.m).padStart(2, "0") + "-" + String(h.d).padStart(2, "0") + " AH"]
    ].concat(warn ? [["span", "chip warn", "Outside the Umm al-Qura table: approximate"]] : []));
    renderHijriSide();
  }
  function renderHijriSide(err) {
    var box = $("#h-res");
    if (err) { box.className = "hc-res bad"; result(box, [["b", "hc-r-en", err[0]], ["span", "hc-r-ar2", err[1], { lang: "ar", dir: "rtl" }]]); return; }
    var z = st.z;
    box.className = "hc-res";
    result(box, [
      ["b", "hc-r-en hc-r-big", W_EN[wd(z)] + ", " + gEn(z)],
      ["span", "hc-r-ar2", W_AR[wd(z)] + " " + gAr(z), { lang: "ar", dir: "rtl" }],
      ["span", "hc-r-mono mono", iso(cfd(z))]
    ]);
  }
  function syncInputs() {
    var h = toHijri(st.z);
    $("#g").value = iso(cfd(st.z));
    $("#hd").value = h.d; $("#hm").value = String(h.m); $("#hy").value = h.y;
  }

  function cell(big, small, z, extra, label) {
    var cls = "hc-day" + (z === st.today ? " today" : "") + (z === st.z ? " sel" : "") + (extra || "");
    return S3.h("button", { "class": cls, type: "button", "data-z": z, title: label, "aria-label": label }, [el("b", null, big), el("small", null, small)]);
  }
  function grid(box, startZ, days, dayFn, smallFn, heads, label) {
    box.innerHTML = "";
    var first = st.week, lead = (wd(startZ) - first + 7) % 7;
    for (var i = 0; i < 7; i++) box.appendChild(el("span", "hc-wd", heads[(first + i) % 7]));
    for (var j = 0; j < lead; j++) box.appendChild(el("span", "hc-blank"));
    for (var k = 0; k < days; k++) {
      var z = startZ + k, w = wd(z);
      box.appendChild(cell(dayFn(z), smallFn(z), z, w === 5 ? " fri" : "", label(z)));
    }
  }
  function renderCalendars() {
    var h = toHijri(st.z), hs = hStart(h.y, h.m), hn = hdim(h.y, h.m);
    $("#h-title").textContent = H_AR[h.m - 1] + " " + A(h.y) + " هـ";
    $("#h-title").appendChild(el("small", null, H_EN[h.m - 1] + " " + h.y, { lang: "en", dir: "ltr" }));
    grid($("#h-cal"), hs, hn, function (z) { return A(toHijri(z).d); }, function (z) {
      var g = cfd(z); return g.d === 1 || z === hs ? A(g.d) + " " + G_AR[st.gm][g.m - 1] : A(g.d);
    }, W_AR_S, function (z) { return hAr(z) + " = " + gAr(z); });

    var g = cfd(st.z), gs = dfc(g.y, g.m, 1), gn = gdim(g.y, g.m);
    $("#g-title").textContent = G_EN[g.m - 1] + " " + g.y;
    $("#g-title").appendChild(el("small", null, G_AR[st.gm][g.m - 1] + " " + A(g.y), { lang: "ar", dir: "rtl" }));
    grid($("#g-cal"), gs, gn, function (z) { return String(cfd(z).d); }, function (z) {
      var x = toHijri(z); return x.d === 1 || z === gs ? x.d + " " + H_EN_S[x.m - 1] : String(x.d);
    }, W_EN_S, function (z) { return gEn(z) + " = " + hEn(z); });
  }

  function renderAge() {
    var box = $("#age"), note = $("#age-note"), zb = parseIso($("#dob").value);
    box.innerHTML = ""; note.textContent = "";
    if (zb == null) { box.appendChild(el("div", "empty hc-age-empty", "Enter a date of birth · أدخل تاريخ الميلاد")); return; }
    if (zb > st.today) { box.appendChild(el("div", "empty hc-age-empty", "That date is in the future · هذا التاريخ في المستقبل")); return; }
    if (!inRange(zb)) { box.appendChild(el("div", "empty hc-age-empty", "Supported from 1882 (1300 AH)")); return; }
    var a = hijriAge(zb, st.today), g = cfd(zb), t = cfd(st.today), gy = t.y - g.y - (t.m < g.m || (t.m === g.m && t.d < g.d) ? 1 : 0);
    function stat(v, en, ar) { var s = el("div", "stat"); s.appendChild(el("b", null, v)); s.appendChild(el("span", null, en + " · " + ar)); return s; }
    box.appendChild(stat(String(a.y), "Hijri years", "سنة هجرية"));
    box.appendChild(stat(a.m + " · " + a.d, "months · days", "أشهر · أيام"));
    box.appendChild(stat(String(gy), "Gregorian years", "سنة ميلادية"));
    box.appendChild(stat(a.days.toLocaleString(), "days lived", "يوماً"));
    var b = toHijri(zb);
    note.textContent = "Born " + hEn(zb) + " (" + W_EN[wd(zb)] + "). Next Hijri birthday: " + (a.next != null ? gEn(a.next) + ", " + hEn(a.next) + (a.next === st.today ? " (today!)" : " (in " + (a.next - st.today) + " days)") : "—") +
      ". Hijri years are about 11 days shorter, so the Hijri age runs ahead of the Gregorian one.";
    note.title = H_AR[b.m - 1];
  }

  function renderAll(fromInput) {
    if (fromInput !== "g" && fromInput !== "h") syncInputs();
    else if (fromInput === "h") $("#g").value = iso(cfd(st.z));
    else { var h = toHijri(st.z); $("#hd").value = h.d; $("#hm").value = String(h.m); $("#hy").value = h.y; }
    renderToday(); renderConverters(); renderCalendars(); renderAge();
    S3.store(KEY, { z: st.z, week: st.week, gm: st.gm, dg: st.dg, dob: $("#dob").value });
  }
  function setZ(z, from) { if (z == null) return; st.z = z; renderAll(from); }

  // ---------- wiring ----------
  function seg(el2, value, onPick) {
    $$("button", el2).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === String(value)));
      b.addEventListener("click", function () {
        $$("button", el2).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onPick(b.dataset.v);
      });
    });
  }
  H_EN.forEach(function (n, i) { $("#hm").appendChild(S3.h("option", { value: String(i + 1), text: (i + 1) + " · " + n + " · " + H_AR[i] })); });

  var now = new Date(), sv = S3.store(KEY) || {};
  st.today = dfc(now.getFullYear(), now.getMonth() + 1, now.getDate());
  st.z = st.today;
  st.week = [0, 1, 6].indexOf(+sv.week) >= 0 ? +sv.week : 6;
  st.gm = sv.gm === "levant" ? "levant" : "intl";
  st.dg = sv.dg === "en" ? "en" : "ar";
  if (sv.dob) $("#dob").value = sv.dob;

  seg($("#wk"), st.week, function (v) { st.week = +v; renderAll(); });
  seg($("#gm"), st.gm, function (v) { st.gm = v; renderAll(); });
  seg($("#dg"), st.dg, function (v) { st.dg = v; renderAll(); });
  $("#g").addEventListener("input", function () { var z = parseIso(this.value); if (z != null && z >= dfc(1882, 11, 12) && z <= dfc(2174, 11, 25)) setZ(z, "g"); });
  function fromHijriInputs() {
    var d = num($("#hd").value), m = +$("#hm").value, y = num($("#hy").value);
    if (!(y >= H_MIN && y <= H_MAX)) return renderHijriSide(["Year must be 1300–1600 AH", "السنة بين ١٣٠٠ و١٦٠٠ هـ"]);
    if (!(d >= 1 && d <= 30)) return renderHijriSide(["Day must be 1–30", "اليوم من ١ إلى ٣٠"]);
    var n = hdim(y, m);
    if (d > n) return renderHijriSide([H_EN[m - 1] + " " + y + " has " + n + " days", "شهر " + H_AR[m - 1] + " " + A(y) + " هـ عدد أيامه " + A(n)]);
    setZ(fromHijri(y, m, d), "h");
  }
  $("#hd").addEventListener("input", fromHijriInputs);
  $("#hy").addEventListener("input", fromHijriInputs);
  $("#hm").addEventListener("change", fromHijriInputs);
  $("#dob").addEventListener("input", function () { renderAge(); S3.store(KEY, Object.assign(S3.store(KEY) || {}, { dob: this.value })); });
  $("#go-today").addEventListener("click", function () { setZ(st.today); });
  $$("#h-cal, #g-cal").forEach(function (c) {
    c.addEventListener("click", function (e) { var b = e.target.closest(".hc-day"); if (b) setZ(+b.dataset.z); });
  });
  function moveH(dir) { var h = toHijri(st.z), t = dir < 0 ? hPrev(h.y, h.m) : hNext(h.y, h.m); if (t.y < H_MIN || t.y > H_MAX) return; setZ(fromHijri(t.y, t.m, Math.min(h.d, hdim(t.y, t.m)))); }
  function moveG(dir) { var g = cfd(st.z), y = g.y, m = g.m + dir; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } var z = dfc(y, m, Math.min(g.d, gdim(y, m))); if (inRange(z)) setZ(z); }
  // RTL header: the button on the right (‹ in DOM first) goes back in time.
  $("#h-prev").addEventListener("click", function () { moveH(-1); });
  $("#h-next").addEventListener("click", function () { moveH(1); });
  $("#g-prev").addEventListener("click", function () { moveG(-1); });
  $("#g-next").addEventListener("click", function () { moveG(1); });
  function copyLine() { var z = st.z; return W_EN[wd(z)] + ", " + gEn(z) + " = " + hEn(z) + " · " + W_AR[wd(z)] + " " + hAr(z); }
  $("#g-copy").addEventListener("click", function () { S3.copy(copyLine()); S3.done(); });
  $("#h-copy").addEventListener("click", function () { S3.copy(copyLine()); S3.done(); });

  renderAll();

  window.S3_DEMO = function () { $("#dob").value = "1995-08-14"; st.z = fromHijri(1447, 9, 1); renderAll(); };

  // Returns true, or a list of failed checks.
  window.S3_SELFTEST = function () {
    var fails = [];
    function eq(a, b, what) { if (a !== b) fails.push(what + ": got " + a + ", want " + b); }
    eq(iso(cfd(fromHijri(1447, 1, 1))), "2025-06-26", "1 Muharram 1447");
    // 1 Ramadan 1447: whatever Gregorian day Intl's Umm al-Qura gives must map back exactly, and be a Wednesday in Feb 2026
    var r = fromHijri(1447, 9, 1), rh = toHijri(r);
    eq(rh.y + "/" + rh.m + "/" + rh.d, "1447/9/1", "1 Ramadan 1447 round trip");
    eq(iso(cfd(r)), "2026-02-18", "1 Ramadan 1447 date");
    eq(W_EN[wd(r)], "Wednesday", "1 Ramadan 1447 weekday");
    var h2000 = toHijri(dfc(2000, 1, 1));
    eq(h2000.y + "/" + h2000.m + "/" + h2000.d, "1420/9/24", "2000-01-01 in Hijri");
    eq(iso(cfd(fromHijri(1300, 1, 1))), "1882-11-12", "1 Muharram 1300");
    // month lengths are 29 or 30; years 354 or 355
    for (var y = 1440; y <= 1450; y++) {
      var len = hStart(y + 1, 1) - hStart(y, 1);
      if (len !== 354 && len !== 355) fails.push("year " + y + " has " + len + " days");
      for (var m = 1; m <= 12; m++) { var n = hdim(y, m); if (n !== 29 && n !== 30) fails.push(y + "/" + m + " has " + n + " days"); }
    }
    // random round trips both ways (seeded so failures repeat)
    var seed = 12345, lo = dfc(1883, 1, 1), hi = dfc(2173, 12, 31);
    function rnd(n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; }
    for (var i = 0; i < 400; i++) {
      var z = lo + rnd(hi - lo), h = toHijri(z);
      if (fromHijri(h.y, h.m, h.d) !== z) fails.push("G->H->G " + iso(cfd(z)));
      var hy = 1301 + rnd(298), hm = 1 + rnd(12), hd = 1 + rnd(29), g = fromHijri(hy, hm, hd), back = g == null ? null : toHijri(g);
      if (!back || back.y !== hy || back.m !== hm || back.d !== hd) fails.push("H->G->H " + hy + "/" + hm + "/" + hd);
    }
    // ages: born 2000-01-01 (24 Ramadan 1420), on 2026-10-26 (15 Jumada al-Ula 1448)
    var a = hijriAge(dfc(2000, 1, 1), dfc(2026, 10, 26)), rab2 = hdim(1448, 4);
    eq(a.y + "y " + a.m + "m " + a.d + "d", "27y 7m " + (15 - 24 + rab2) + "d", "Hijri age");
    var b = hijriAge(dfc(2025, 6, 26), fromHijri(1448, 1, 1)), next = toHijri(b.next);
    eq(b.y + "/" + b.m + "/" + b.d, "1/0/0", "age exactly one Hijri year");
    eq(next.m + "/" + next.d, "1/1", "next Hijri birthday is 1 Muharram");
    return fails.length ? fails.slice(0, 6) : true;
  };
})();
