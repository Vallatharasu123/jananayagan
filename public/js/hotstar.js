(function () {
  var HOTSTAR_URL =
    "https://www.hotstar.com/in/movies/bhagavanth-kesari/1971011105";
  var NOTICE_KEY = "jananayagan_hotstar_notice_dismissed";
  var MODAL_DONE_KEY = "jananayagan_advertisement_modal_done_v2";
  var SKIP_ADVERTISEMENT_KEY = "jananayagan_advertisement_skip_v1";
  var LAST_AD_KEY = "jananayagan_last_campaign_path";

  var ADVERTISEMENT_OPEN_MS = 2000;
  var NOTICE_SHOW_MS = 9000;

  /* Short ASCII names so Linux/git (e.g. Render) can checkout; NAME_MAX paths. */
  var AD_VIDEOS = [
    "/add_campaign/ad-campaign-01.mp4",
    "/add_campaign/ad-campaign-02.mp4",
    "/add_campaign/ad-campaign-03.mp4",
    "/add_campaign/ad-campaign-04.mp4",
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function pathNorm(href) {
    try {
      return new URL(href, window.location.origin).pathname;
    } catch (e) {
      return href || "";
    }
  }

  function rememberCampaignPath(videoEl) {
    if (!videoEl || !videoEl.src) return;
    sessionStorage.setItem(LAST_AD_KEY, pathNorm(videoEl.src));
  }

  function pickAdQueueExcludingLast() {
    var last = sessionStorage.getItem(LAST_AD_KEY) || "";
    var pool = AD_VIDEOS.filter(function (u) {
      return pathNorm(u) !== last;
    });
    if (pool.length === 0) pool = AD_VIDEOS.slice();
    return shuffle(pool);
  }

  function isHotstarOutboundAnchor(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
      var h = new URL(anchor.href).hostname.toLowerCase();
      return h === "www.hotstar.com" || h === "hotstar.com" || h.endsWith(".hotstar.com");
    } catch (e) {
      return false;
    }
  }

  /**
   * Browsers block unmuted autoplay without a recent user gesture. Call this from intro/other clicks
   * so play() runs right after load; still may require manual play on strict mobile browsers.
   */
  function playAdvertisementUnmuted(video, setStatus, playingMsg, needTapMsg) {
    if (!video) return;
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    var playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(function () {
          if (setStatus) setStatus(playingMsg);
        })
        .catch(function () {
          if (setStatus) setStatus(needTapMsg);
        });
    }
  }

  function initNotice() {
    var bar = document.getElementById("hotstar-notice");
    var btn = document.getElementById("hotstar-notice-close");
    if (!bar || !btn) return;
    if (sessionStorage.getItem(NOTICE_KEY)) return;

    function show() {
      bar.hidden = false;
    }

    setTimeout(show, NOTICE_SHOW_MS);

    btn.addEventListener("click", function () {
      sessionStorage.setItem(NOTICE_KEY, "1");
      bar.hidden = true;
    });
  }

  function updateBodyScrollLock() {
    var s = document.getElementById("advertisement-modal");
    var g = document.getElementById("hotstar-gate-modal");
    var lock = (s && !s.hidden) || (g && !g.hidden);
    document.body.style.overflow = lock ? "hidden" : "";
  }

  function closeModal(modal, video) {
    modal.hidden = true;
    updateBodyScrollLock();
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }

  function initAdvertisementModal() {
    var modal = document.getElementById("advertisement-modal");
    var stepIntro = document.getElementById("advertisement-step-intro");
    var stepVideo = document.getElementById("advertisement-step-video");
    var video = document.getElementById("advertisement-video");
    var continueBtn = document.getElementById("advertisement-continue");
    var btnYes = document.getElementById("advertisement-yes");
    var btnDecline = document.getElementById("advertisement-decline");
    var statusEl = document.getElementById("advertisement-load-status");
    if (!modal || !stepIntro || !stepVideo || !video || !continueBtn || !btnYes || !btnDecline) return;

    if (sessionStorage.getItem(MODAL_DONE_KEY) || sessionStorage.getItem(SKIP_ADVERTISEMENT_KEY)) {
      return;
    }

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg || "";
    }

    function unlockContinue() {
      continueBtn.disabled = false;
      continueBtn.focus();
    }

    function lockContinue() {
      continueBtn.disabled = true;
    }

    var urls = shuffle(AD_VIDEOS);
    var idx = 0;
    var videoStarted = false;

    function tryNext() {
      if (idx >= urls.length) {
        setStatus("Advertisement unavailable. You may continue.");
        unlockContinue();
        return;
      }
      var url = urls[idx];
      idx += 1;
      setStatus("Loading…");
      lockContinue();

      video.onerror = function () {
        tryNext();
      };
      video.onloadeddata = function () {
        video.onerror = null;
        rememberCampaignPath(video);
        playAdvertisementUnmuted(
          video,
          setStatus,
          "Playing with sound. Continue unlocks when the video ends.",
          "Tap play on the video for sound. Continue unlocks when the video ends."
        );
      };

      video.preload = "auto";
      video.src = url;
      video.load();
    }

    function showIntro() {
      modal.hidden = false;
      updateBodyScrollLock();
      stepIntro.hidden = false;
      stepVideo.hidden = true;
      btnYes.focus();
    }

    function optOut() {
      sessionStorage.setItem(SKIP_ADVERTISEMENT_KEY, "1");
      closeModal(modal, videoStarted ? video : null);
    }

    setTimeout(showIntro, ADVERTISEMENT_OPEN_MS);

    btnYes.addEventListener("click", function () {
      videoStarted = true;
      stepIntro.hidden = true;
      stepVideo.hidden = false;
      lockContinue();
      tryNext();
    });

    btnDecline.addEventListener("click", optOut);

    video.addEventListener("ended", unlockContinue);

    continueBtn.addEventListener("click", function () {
      sessionStorage.setItem(MODAL_DONE_KEY, "1");
      closeModal(modal, video);
    });

    document.addEventListener("keydown", function onKey(e) {
      if (modal.hidden) {
        document.removeEventListener("keydown", onKey);
        return;
      }
      if (e.key === "Escape") {
        if (!stepVideo.hidden && !continueBtn.disabled) {
          sessionStorage.setItem(MODAL_DONE_KEY, "1");
          closeModal(modal, video);
          document.removeEventListener("keydown", onKey);
        } else if (!stepIntro.hidden) {
          optOut();
          document.removeEventListener("keydown", onKey);
        }
      }
    });
  }

  function initHotstarGate() {
    var gateModal = document.getElementById("hotstar-gate-modal");
    var gateVideo = document.getElementById("hotstar-gate-video");
    var gateOpen = document.getElementById("hotstar-gate-open");
    var gateCancel = document.getElementById("hotstar-gate-cancel");
    var gateStatus = document.getElementById("hotstar-gate-status");
    if (!gateModal || !gateVideo || !gateOpen || !gateCancel) return;

    var pendingUrl = null;
    var queue = [];
    var qIdx = 0;

    function setGateStatus(t) {
      if (gateStatus) gateStatus.textContent = t || "";
    }

    var GATE_BTN_DOWNLOAD = "Download";

    function lockGateOpen() {
      gateOpen.disabled = true;
    }

    function unlockGateOpen() {
      gateOpen.textContent = GATE_BTN_DOWNLOAD;
      gateOpen.disabled = false;
      gateOpen.focus();
    }

    /** Seconds remaining on the same button label; at 0 switch label to Download and enable. */
    function syncGateDownloadCountdown() {
      if (gateModal.hidden) return;
      if (!gateVideo.src) return;
      var d = gateVideo.duration;
      if (!d || !isFinite(d)) {
        setGateStatus("");
        lockGateOpen();
        gateOpen.textContent = "Loading…";
        return;
      }
      var left = Math.max(0, Math.ceil(d - gateVideo.currentTime));
      if (gateVideo.ended || left <= 0) {
        setGateStatus("");
        unlockGateOpen();
        return;
      }
      lockGateOpen();
      gateOpen.textContent = "Unlocks in " + left + "s";
      setGateStatus("");
    }

    function closeGate() {
      gateModal.hidden = true;
      updateBodyScrollLock();
      gateVideo.pause();
      gateVideo.removeAttribute("src");
      gateVideo.load();
      pendingUrl = null;
      queue = [];
      qIdx = 0;
      lockGateOpen();
      gateOpen.textContent = GATE_BTN_DOWNLOAD;
    }

    function tryLoadGateVideo() {
      if (qIdx >= queue.length) {
        setGateStatus("Advertisement unavailable. You may open Hotstar.");
        unlockGateOpen();
        return;
      }
      var url = queue[qIdx];
      qIdx += 1;
      setGateStatus("");
      lockGateOpen();
      gateOpen.textContent = "Loading…";

      gateVideo.onerror = function () {
        tryLoadGateVideo();
      };
      gateVideo.onloadeddata = function () {
        gateVideo.onerror = null;
        rememberCampaignPath(gateVideo);
        playAdvertisementUnmuted(
          gateVideo,
          setGateStatus,
          "",
          "Tap play on the video for sound."
        );
        syncGateDownloadCountdown();
      };

      gateVideo.preload = "auto";
      gateVideo.src = url;
      gateVideo.load();
    }

    function openHotstarGate(url) {
      pendingUrl = url;
      queue = pickAdQueueExcludingLast();
      qIdx = 0;
      gateModal.hidden = false;
      updateBodyScrollLock();
      lockGateOpen();
      tryLoadGateVideo();
    }

    gateVideo.addEventListener("timeupdate", syncGateDownloadCountdown);
    gateVideo.addEventListener("loadedmetadata", syncGateDownloadCountdown);
    gateVideo.addEventListener("ended", syncGateDownloadCountdown);

    gateOpen.addEventListener("click", function () {
      if (!pendingUrl) return;
      window.open(pendingUrl, "_blank", "noopener,noreferrer");
      closeGate();
    });

    gateCancel.addEventListener("click", closeGate);

    document.addEventListener("keydown", function (e) {
      if (gateModal.hidden) return;
      if (e.key === "Escape") {
        closeGate();
      }
    });

    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a || !isHotstarOutboundAnchor(a)) return;
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        openHotstarGate(a.href);
      },
      false
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNotice();
    initAdvertisementModal();
    initHotstarGate();
  });

  window.JANANAYAGAN_HOTSTAR_URL = HOTSTAR_URL;
})();
