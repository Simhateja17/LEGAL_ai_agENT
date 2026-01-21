module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.js'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  forceExit: true
};
