(function configureTypingWarMatchmaking() {
  const PRODUCTION_URL =
    "wss://typingmeter-matchmaking.saurabhc-0102.workers.dev/";

  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0";

  window.TYPINGMETER_MATCHMAKING_URL = isLocal
    ? "ws://localhost:8787"
    : PRODUCTION_URL;
})();
