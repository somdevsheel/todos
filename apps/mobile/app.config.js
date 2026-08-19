// app.json -> app.config.js: needed for exactly one reason — a static JSON
// file can't reference an environment variable, and google-services.json
// is deliberately gitignored (see .gitignore/ANDROID.md), so EAS Build
// can't just find it as an uploaded project file. Instead it's provided as
// an EAS "file" type environment variable named GOOGLE_SERVICES_JSON,
// which EAS Build downloads to a real path and exposes via that same env
// var name at build time. Falls back to the local gitignored file for
// local `expo start`/`expo prebuild`, where the real file just sits on
// disk like any other local dev secret.
module.exports = {
  expo: {
    name: "Arutech Workspace",
    slug: "arutech-workspace",
    scheme: "arutechworkspace",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    // 1024x1024, solid brand-teal background (matches adaptiveIcon.backgroundColor
    // below) — real logo, but upscaled from the only source available (a
    // 250x250 PNG) via LANCZOS resampling; some softness is visible on close
    // inspection. Real asset, not a placeholder, with an honest quality caveat.
    icon: "./assets/icon.png",
    android: {
      package: "com.arutechconsultancy.workspace",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        // Transparent, safe-zone-padded (logo occupies ~55% of the canvas) —
        // Android crops this into a circle/squircle/rounded-square per-launcher,
        // and content too close to the edge gets clipped.
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2F5D50",
      },
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      "@react-native-community/datetimepicker",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#2F5D50",
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: "9a337281-19e9-446e-912c-23a09f05f895",
      },
    },
  },
};
