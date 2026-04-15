module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/src/frontend.test.js"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx", "json"],
};
