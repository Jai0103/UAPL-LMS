import { Download, RefreshCw, Signal, SignalZero, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "uapl_lms_pwa_install_dismissed_v1";
const DISMISS_TIME = 7 * 24 * 60 * 60 * 1000;

export default function PwaManager() {
  const [online, setOnline] = useState(navigator.onLine);
  const [reconnected, setReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installHelp, setInstallHelp] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef(null);
  const wasOfflineRef = useRef(!navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      if (wasOfflineRef.current) {
        setReconnected(true);
        setTimeout(() => setReconnected(false), 3500);
      }
      wasOfflineRef.current = false;
    }

    function handleOffline() {
      wasOfflineRef.current = true;
      setReconnected(false);
      setOnline(false);
    }

    function handleInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstall(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL
      }).then(registration => {
        registrationRef.current = registration;

        if (registration.waiting) setUpdateReady(true);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!dismissed || Date.now() - dismissed > DISMISS_TIME) {
      setTimeout(() => setShowInstall(true), 3000);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setShowInstall(false);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setInstallHelp(isIos ? "ios" : "desktop");
  }

  function dismissInstall() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowInstall(false);
  }

  function updateApp() {
    registrationRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <>
      {!online && (
        <div className="fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl">
          <SignalZero className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-black text-slate-950">You are offline</p>
            <p className="text-xs font-semibold text-slate-500">Live syncing will resume when internet returns.</p>
          </div>
        </div>
      )}

      {online && reconnected && (
        <div className="fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
          <Signal className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-black text-slate-950">Connection restored</p>
            <p className="text-xs font-semibold text-slate-500">The LMS can sync again.</p>
          </div>
        </div>
      )}

      {showInstall && !updateReady && online && (
        <div className="fixed inset-x-3 bottom-5 z-[120] mx-auto max-w-md rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-950">Install UAPL LMS</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Add this portal to your device for faster access.
              </p>
            </div>
            <button onClick={dismissInstall} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button onClick={installApp} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white">
            <Download className="h-4 w-4" />
            Install App
          </button>
        </div>
      )}

      {updateReady && (
        <div className="fixed inset-x-3 bottom-5 z-[125] mx-auto max-w-md rounded-3xl border border-sky-200 bg-white p-5 shadow-2xl">
          <p className="font-black text-slate-950">Update ready</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Refresh to load the latest LMS version.</p>
          <button onClick={updateApp} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Update Now
          </button>
        </div>
      )}

      {installHelp && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">
              {installHelp === "ios" ? "Install on iPhone" : "Install on Desktop"}
            </h2>
            <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-600">
              {installHelp === "ios" ? (
                <>
                  <p>1. Open this site in Safari.</p>
                  <p>2. Tap Share.</p>
                  <p>3. Choose Add to Home Screen.</p>
                  <p>4. Tap Add.</p>
                </>
              ) : (
                <>
                  <p>1. Open this site in Chrome or Edge.</p>
                  <p>2. Open the browser menu.</p>
                  <p>3. Choose Install App or Install Page as App.</p>
                </>
              )}
            </div>
            <button onClick={() => setInstallHelp(null)} className="mt-5 h-11 w-full rounded-2xl bg-slate-950 text-sm font-black text-white">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
