// Set DATABASE_URL for tests if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://godinez:godinez123@localhost:5432/godinez_studio";
}
