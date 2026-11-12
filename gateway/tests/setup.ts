process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? "postgresql://aocc:aocc_dev_password@localhost:5433/aocc_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.AI_SERVICE_URL = "http://localhost:8099";
process.env.JWT_SECRET = "test-secret-at-least-8-chars";
process.env.JWT_EXPIRES_IN = "1h";
