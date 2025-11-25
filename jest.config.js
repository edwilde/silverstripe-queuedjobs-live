module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/js/**/*.test.js'],
    collectCoverageFrom: [
        'client/src/**/*.js',
        '!client/dist/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true
};
