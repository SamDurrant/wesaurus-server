module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_URL: process.env.DB_URL || 'postgresql://librarian@localhost/wesaurus',
  TEST_DB_URL:
    process.env.TEST_DB_URL || 'postgresql://librarian@localhost/wesaurus-test',
  JWT_SECRET: process.env.JWT_SECRET || 'sky-love',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '60000s',
}
