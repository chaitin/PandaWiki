CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO users (id, account, password, role, created_at, last_access)
VALUES (
    uuid_generate_v4(),
    'admin',
    crypt('admin123', gen_salt('bf', 10)),
    'admin',
    NOW(),
    NULL
)
ON CONFLICT (account) DO UPDATE SET password = EXCLUDED.password;

SELECT id, account, role, created_at, last_access FROM users WHERE account = 'admin';