/* ── TURCRYPTOR static web client (fully client-side) ──────────────── */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ── i18n ────────────────────────────────────────────────────── */

  const I18N = {
    en: {
      tagline: "Secure Text Encryption",
      badges: "AES-256-GCM · Scrypt · Decrypted on your device",
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
      footer: "TURCRYPTOR · crafted by Yassin · nothing leaves this device",
      showPw: "Show password", hidePw: "Hide password",

      emptyMessage: "✦ Message cannot be empty.",
      emptyPayload: "✦ Encrypted payload cannot be empty.",
      mismatch: "✦ Passwords do not match.",
      encDone: "✓ Encryption complete — copy the payload and share it.",
      decDone: "✓ Decryption complete.",

      errFormat: "✦ Not a valid Turcryptor payload.",
      errDecrypt: "✦ Wrong password or corrupted encrypted message.",
      errCrypto: "✦ Encryption failed — this browser is too old.",
    },
    fa: {
      tagline: "رمزنگاری امن متن",
      badges: "AES-256-GCM · Scrypt · رمزگشایی روی دستگاه خودت",
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
      footer: "تورکریپتور · ساخته‌شده توسط یاسین · هیچ‌چیز از دستگاهت خارج نمی‌شه",
      showPw: "نمایش رمز", hidePw: "پنهان‌کردن رمز",

      emptyMessage: "✦ پیام نمی‌تواند خالی باشد.",
      emptyPayload: "✦ پیام رمزشده نمی‌تواند خالی باشد.",
      mismatch: "✦ رمزها یکسان نیستند.",
      encDone: "✓ رمزنگاری کامل شد — پیام رمزشده را کپی کن و بفرست.",
      decDone: "✓ رمزگشایی کامل شد.",

      errFormat: "✦ این یک پیام معتبر تورکریپتور نیست.",
      errDecrypt: "✦ رمز اشتباهه یا پیام خراب شده.",
      errCrypto: "✦ رمزنگاری شکست خورد — مرورگرت قدیمیه.",
    },
  };

  let lang = localStorage.getItem("tc-lang") || "en";

  const t = (key) => (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;

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
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  /* ── crypto error mapping ────────────────────────────────────── */

  function cryptoError(error) {
    if (error instanceof TC1.Tc1Error) {
      return error.message === "format" ? t("errFormat") : t("errDecrypt");
    }
    return t("errCrypto");
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

    const btn = $("enc-submit");
    btn.disabled = true;
    btn.querySelector(".btn-idle").hidden = true;
    btn.querySelector(".btn-busy").hidden = false;

    try {
      const payload = await TC1.encryptMessage(message, password);
      showResult("encTitle", payload);
      showStatus("success", t("encDone"));
    } catch (error) {
      showStatus("error", cryptoError(error));
    } finally {
      btn.disabled = false;
      btn.querySelector(".btn-idle").hidden = false;
      btn.querySelector(".btn-busy").hidden = true;
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

    const btn = $("dec-submit");
    btn.disabled = true;
    btn.querySelector(".btn-idle").hidden = true;
    btn.querySelector(".btn-busy").hidden = false;

    try {
      const message = await TC1.decryptMessage(payload, password);
      showResult("decTitle", message);
      showStatus("success", t("decDone"));
    } catch (error) {
      showStatus("error", cryptoError(error));
    } finally {
      btn.disabled = false;
      btn.querySelector(".btn-idle").hidden = false;
      btn.querySelector(".btn-busy").hidden = true;
    }
  });

  applyLang();
})();
