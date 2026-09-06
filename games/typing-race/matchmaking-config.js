/* TypingMeter Quick Match configuration.
   Local testing: keep the default ws://localhost:8787.
   Production: replace PRODUCTION_URL with your deployed Worker URL.
*/
(function configureTypingMeterMatchmaking() {
  const PRODUCTION_URL = "https://typingmeter-matchmaking.saurabhc-0102.workers.dev/"; // Example: wss://typingmeter-matchmaking.example.workers.dev
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";

  window.TYPINGMETER_MATCHMAKING_URL = isLocal
    ? "ws://localhost:8787"
    : PRODUCTION_URL;
})();
