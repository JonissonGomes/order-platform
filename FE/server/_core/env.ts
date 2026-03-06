export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
};
