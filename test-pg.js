const { Client } = require("pg");

// Read connection string from env
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

console.log("Connecting to Supabase DB...");
const client = new Client({
  connectionString: dbUrl,
  connectionTimeoutMillis: 15000,
});

client
  .connect()
  .then(() => client.query("SELECT 1 as test"))
  .then((r) => {
    console.log("SUCCESS:", JSON.stringify(r.rows));
    return client.end();
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.log("FAILED:", e.message);
    process.exit(1);
  });
