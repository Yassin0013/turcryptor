/* ── TURCRYPTOR web UI logic ───────────────────────────────────────── */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ── i18n ────────────────────────────────────────────────────── */

  const I18N = {
    en: {
      tagline: "Secure Text Encryption",
      badges: "AES-256-GCM · Scrypt · Local Only",
      tabLock: "LOCK", tabLockSub: "Encrypt",
      tabUnlock: "UNLOCK", tabUnlockSub: "Decrypt",
      encMessage: "Message",
      encMessagePh: "Type the message to encrypt…",
      password: "Password", confirm: "Confirm",
      encSubmit: "🔒 \u00A0ENCRYPT", encBusy: "◌ \u00A0ENCRYPTING…",
      decPayload: "Encrypted payload",
      decSubmit: "🔓 \u00A0DECRYPT", decBusy: "◌ \u00A0DECRYPTING…",
      encTitle: "ENCRYPTED PAYLOAD", decTitle: "DECRYPTED MESSAGE",
      copy: "⧉ Copy", copied: "✓ Copied",
      footer: "crafted by Yassin · everything stays on this machine",
      showPw: "Show password", hidePw: "Hide password",

      emptyMessage: "✦ Message cannot be empty.",
      emptyPayload: "✦ Encrypted payload cannot be empty.",
      emptyPassword: "✦ Password cannot be empty.",
      mismatch: "✦ Passwords do not match.",
      encDone: "✓ Encryption complete — copy the payload and share it.",
      decDone: "✓ Decryption complete.",
      serverDown: "✦ Server unreachable — is webapp.py still running?",

      errRate: "✦ Too many requests — slow down.",
      errMessage: "✦ Message is empty or too large.",
      errPassword: "✦ Password cannot be empty.",
      errMismatch: "✦ Passwords do not match.",
      errPayload: "✦ Encrypted payload is empty or too large.",
      errDecrypt: "✦ Wrong password or corrupted encrypted message.",
      errFormat: "✦ Not a valid Turcryptor payload.",
    },
    fa: {
      tagline: "رمزنگاری امن متن",
      badges: "AES-256-GCM · Scrypt · فقط محلی",
      tabLock: "قفل", tabLockSub: "رمزنگاری",
      tabUnlock: "بازکردن", tabUnlockSub: "رمزگشایی",
      encMessage: "پیام",
      encMessagePh: "متنی که می‌خواهی رمزنگاری شود…",
      password: "رمز", confirm: "تأیید رمز",
      encSubmit: "🔒 \u00A0رمزنگاری", encBusy: "◌ \u00A0در حال رمزنگاری…",
      decPayload: "پیام رمزشده",
      decSubmit: "🔓 \u00A0رمزگشایی", decBusy: "◌ \u00A0در حال رمزگشایی…",
      encTitle: "پیام رمزشده", decTitle: "پیام اصلی",
      copy: "⧉ کپی", copied: "✓ کپی شد",
      footer: "تورکریپتور · ساخته‌شده توسط یاسین · همه‌چیز روی همین دستگاه می‌ماند",
      showPw: "نمایش رمز", hidePw: "پنهان‌کردن رمز",

      emptyMessage: "✦ پیام نمی‌تواند خالی باشد.",
      emptyPayload: "✦ پیام رمزشده نمی‌تواند خالی باشد.",
      emptyPassword: "✦ رمز نمی‌تواند خالی باشد.",
      mismatch: "✦ رمزها یکسان نیستند.",
      encDone: "✓ رمزنگاری کامل شد — پیام رمزشده را کپی کن.",
      decDone: "✓ رمزگشایی کامل شد.",
      serverDown: "✦ سرور در دسترس نیست — webapp.py هنوز در حال اجراست؟",

      errRate: "✦ تعداد درخواست‌ها زیاده — کمی آهسته‌تر.",
      errMessage: "✦ پیام خالیه یا بیش از حد طولانیه.",
      errPassword: "✦ رمز نمی‌تواند خالی باشد.",
      errMismatch: "✦ رمزها یکسان نیستند.",
      errPayload: "✦ پیام رمزشده خالیه یا بیش از حد طولانیه.",
      errDecrypt: "✦ رمز اشتباهه یا پیام خراب شده.",
      errFormat: "✦ این یک پیام معتبر تورکریپتور نیست.",
    },
  };

  // server error strings -> i18n key
  const ERROR_KEY = {
    "Too many requests — slow down.": "errRate",
    "Message is empty or too large.": "errMessage",
    "Password cannot be empty.": "errPassword",
    "Passwords do not match.": "errMismatch",
    "Encrypted payload is empty or too large.": "errPayload",
    "Wrong password or corrupted encrypted message.": "errDecrypt",
    "Not a valid Turcryptor payload.": "errFormat",
  };

  let lang = localStorage.getItem("tc-lang") || "en";

  const t = (key) => (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;

  function serverError(raw) {
    const key = ERROR_KEY[raw];
    return key ? t(key) : `✦ ${raw}`;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });

    $("lang-toggle").textContent = lang === "fa" ? "EN" : "فا";
    if (!result.hidden) resultTitle.textContent = t(lastTitleKey);
    localStorage.setItem("tc-lang", lang);
  }

  /* ── tabs ────────────────────────────────────────────────────── */

  const tabs = document.querySelectorAll(".tab");
  const paneLock = $("pane-lock");
  const paneUnlock = $("pane-unlock");
  const status = $("status");
  const result = $("result");
  const resultTitle = $("result-title");
  const resultBody = $("result-body");
  const copyBtn = $("copy-btn");

  let lastResult = "";
  let lastTitleKey = "encTitle";

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((tl) => tl.classList.toggle("active", tl === tab));
      const lock = tab.dataset.mode === "lock";
      paneLock.hidden = !lock;
      paneUnlock.hidden = lock;
      hideStatus();
      hideResult();
    });
  });

  /* ── language toggle ─────────────────────────────────────────── */

  $("lang-toggle").addEventListener("click", () => {
    lang = lang === "fa" ? "en" : "fa";
    applyLang();
  });

  /* ── status & result helpers ─────────────────────────────────── */

  function showStatus(kind, text) {
    status.className = `status ${kind}`;
    status.textContent = text;
    status.hidden = false;
  }

  function hideStatus() {
    status.hidden = true;
  }

  function showResult(titleKey, body) {
    lastTitleKey = titleKey;
    resultTitle.textContent = t(titleKey);
    resultBody.textContent = body;
    lastResult = body;
    result.hidden = false;
  }

  function hideResult() {
    result.hidden = true;
    lastResult = "";
  }

  /* ── copy ────────────────────────────────────────────────────── */

  copyBtn.addEventListener("click", async () => {
    if (!lastResult) return;
    try {
      await navigator.clipboard.writeText(lastResult);
    } catch {
      const sel = document.createRange();
      sel.selectNodeContents(resultBody);
      getSelection().removeAllRanges();
      getSelection().addRange(sel);
      document.execCommand("copy");
      getSelection().removeAllRanges();
    }
    copyBtn.textContent = t("copied");
    copyBtn.classList.add("done");
    setTimeout(() => {
      copyBtn.textContent = t("copy");
      copyBtn.classList.remove("done");
    }, 1600);
  });

  /* ── password visibility ─────────────────────────────────────── */

  document.querySelectorAll(".eye").forEach((eye) => {
    eye.addEventListener("click", () => {
      const input = $(eye.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      eye.setAttribute("aria-label", show ? t("hidePw") : t("showPw"));
      eye.textContent = show ? "🙈" : "👁";
    });
  });

  /* ── API ─────────────────────────────────────────────────────── */

  async function callApi(url, body, btn) {
    btn.disabled = true;
    btn.querySelector(".btn-idle").hidden = true;
    btn.querySelector(".btn-busy").hidden = false;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch {
      return { ok: false, error: t("serverDown") };
    } finally {
      btn.disabled = false;
      btn.querySelector(".btn-idle").hidden = false;
      btn.querySelector(".btn-busy").hidden = true;
    }
  }

  /* ── encrypt form ────────────────────────────────────────────── */

  $("pane-lock").addEventListener("submit", async (event) => {
    event.preventDefault();
    hideStatus();
    hideResult();

    const message = $("enc-message").value;
    const password = $("enc-password").value;
    const confirm = $("enc-confirm").value;

    if (!message.trim()) return showStatus("warning", t("emptyMessage"));
    if (!password) return showStatus("warning", t("emptyPassword"));
    if (password !== confirm) return showStatus("error", t("mismatch"));

    const data = await callApi("/api/encrypt", { message, password, confirm }, $("enc-submit"));

    if (data.ok) {
      showResult("encTitle", data.payload);
      showStatus("success", t("encDone"));
    } else {
      showStatus("error", serverError(data.error));
    }
  });

  /* ── decrypt form ────────────────────────────────────────────── */

  $("pane-unlock").addEventListener("submit", async (event) => {
    event.preventDefault();
    hideStatus();
    hideResult();

    const payload = $("dec-payload").value;
    const password = $("dec-password").value;

    if (!payload.trim()) return showStatus("warning", t("emptyPayload"));
    if (!password) return showStatus("warning", t("emptyPassword"));

    const data = await callApi("/api/decrypt", { payload, password }, $("dec-submit"));

    if (data.ok) {
      showResult("decTitle", data.message);
      showStatus("success", t("decDone"));
    } else {
      showStatus("error", serverError(data.error));
    }
  });

  applyLang();
})();
