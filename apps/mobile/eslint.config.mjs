import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    rules: {
      // This app's screens repeatedly seed local mutable state from an
      // async fetch (useApiQuery's result) and then diverge it via other
      // event handlers (WebSocket messages, user edits) — e.g.
      // chat/[id].tsx's `messages` state, seeded from the initial REST
      // fetch, then patched by message:new/updated/deleted. That's a
      // different shape than the "derive state you could've computed
      // inline during render" case this rule targets, and the same
      // pattern apps/web's equivalent components already use.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
