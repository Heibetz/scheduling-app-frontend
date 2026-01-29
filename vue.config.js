module.exports = {
  devServer: {
    host: "localhost",
    port: 8081,
  },
  publicPath:
    process.env.NODE_ENV === "development" ? "/" : "/sev2026/t5/",
  transpileDependencies: ["vuetify"],
};
