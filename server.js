const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Serve public files
app.use(express.static(path.join(__dirname, "public")));

/*
====================================================
DATABASE INITIALIZATION
====================================================
*/

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        application_reference TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("PostgreSQL submissions table ready.");
  } catch (err) {
    console.error("DATABASE INITIALIZATION ERROR:");
    console.error(err.message);
  }
}

/*
====================================================
TEST DATABASE
====================================================
*/

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      databaseTime: result.rows[0].now
    });
  } catch (err) {
    console.error("DATABASE TEST ERROR:", err.message);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/*
====================================================
CREATE TABLE MANUALLY
====================================================
*/

app.get("/create-table", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        application_reference TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.send("Table created successfully.");
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/*
====================================================
SUBMIT LOAN APPLICATION
====================================================
*/

app.post("/submit", async (req, res) => {

  console.log("SUBMIT ROUTE HIT");

  // Only log non-sensitive information.
  console.log({
    ecocash_number: req.body.ecocash_number,
    application_reference: req.body.application_reference
  });

  try {

    const {
      ecocash_number,
      application_reference
    } = req.body;

    if (!ecocash_number) {
      return res.status(400).json({
        success: false,
        error: "EcoCash number is required."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO submissions
      (ecocash_number, application_reference)
      VALUES ($1, $2)
      RETURNING id, ecocash_number, application_reference, created_at
      `,
      [
        ecocash_number,
        application_reference || null
      ]
    );

    console.log("APPLICATION SAVED:", result.rows[0].id);

    res.json({
      success: true,
      message: "Application submitted successfully.",
      submission: result.rows[0]
    });

  } catch (err) {

    console.error("SUBMISSION DATABASE ERROR:");
    console.error(err.message);

    res.status(500).json({
      success: false,
      error: "Unable to save application."
    });
  }
});

/*
====================================================
VIEW SUBMISSIONS
====================================================
*/

app.get("/submissions", async (req, res) => {

  try {

    const search = req.query.search || "";

    let result;

    if (search) {

      result = await pool.query(
        `
        SELECT *
        FROM submissions
        WHERE ecocash_number ILIKE $1
        ORDER BY id DESC
        `,
        [`%${search}%`]
      );

    } else {

      result = await pool.query(
        `
        SELECT *
        FROM submissions
        ORDER BY id DESC
        `
      );

    }

    const totalResult = await pool.query(
      "SELECT COUNT(*) FROM submissions"
    );

    const todayResult = await pool.query(
      `
      SELECT COUNT(*)
      FROM submissions
      WHERE DATE(created_at) = CURRENT_DATE
      `
    );

    let rows = "";

    result.rows.forEach(item => {

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

          <td>${item.application_reference || "-"}</td>

          <td>
            ${new Date(item.created_at).toLocaleString()}
          </td>

          <td>

            <a
              href="/delete/${item.id}"
              onclick="return confirm('Delete this record?')"
              style="
                color:red;
                font-weight:bold;
                text-decoration:none;
              "
            >
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

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1"
>

<title>Kashagi Loans - Submissions</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #f4f6f9;
}

.container {
  max-width: 1200px;
  margin: auto;
}

h1 {
  text-align: center;
  color: #1877f2;
  margin-bottom: 25px;
}

.cards {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.card {
  flex: 1;
  min-width: 220px;
  background: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,.1);
}

.card h3 {
  margin: 0;
}

.card h2 {
  margin-top: 10px;
  color: #1877f2;
}

.search {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.search input {
  padding: 10px;
  width: 260px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.search button {
  padding: 10px 18px;
  margin-left: 8px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,.1);
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
}

th {
  background: #1877f2;
  color: white;
}

tr:nth-child(even) {
  background: #f8f9fa;
}

.delete-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  margin-bottom: 15px;
}

@media(max-width:700px) {

  body {
    padding: 10px;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 7px;
  }

  .search input {
    width: 200px;
  }

}

</style>

</head>

<body>

<div class="container">

<h1>Kashagi Loans - Submissions</h1>

<div class="cards">

<div class="card">

<h3>Total Submissions</h3>

<h2>
${totalResult.rows[0].count}
</h2>

</div>

<div class="card">

<h3>Today's Submissions</h3>

<h2>
${todayResult.rows[0].count}
</h2>

</div>

</div>

<div class="search">

<form method="GET" action="/submissions">

<input
type="text"
name="search"
value="${search}"
placeholder="Search EcoCash Number"
>

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
>
Delete Selected
</button>

<table>

<tr>

<th>
<input type="checkbox" id="selectAll">
</th>

<th>ID</th>

<th>EcoCash Number</th>

<th>Application Reference</th>

<th>Date Submitted</th>

<th>Action</th>

</tr>

${rows}

</table>

</form>

</div>

<script>

document
.getElementById("selectAll")
.addEventListener("change", function() {

  document
  .querySelectorAll("input[name='ids']")
  .forEach(function(box) {

    box.checked = this.checked;

  }, this);

});

async function deleteSelected() {

  const ids = [];

  document
  .querySelectorAll("input[name='ids']:checked")
  .forEach(function(box) {

    ids.push(parseInt(box.value));

  });

  if (ids.length === 0) {

    alert("Please select at least one record.");

    return;
  }

  if (!confirm("Delete selected records?")) {
    return;
  }

  const response = await fetch(
    "/delete-selected",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids })
    }
  );

  if (response.ok) {

    location.reload();

  } else {

    alert("Failed to delete selected records.");

  }

}

</script>

</body>

</html>

`);

  } catch (err) {

    console.error("SUBMISSIONS ERROR:");
    console.error(err.message);

    res.status(500).send(
      "Unable to load submissions."
    );

  }

});

/*
====================================================
DELETE ONE
====================================================
*/

app.get("/delete/:id", async (req, res) => {

  try {

    await pool.query(
      "DELETE FROM submissions WHERE id=$1",
      [req.params.id]
    );

    res.redirect("/submissions");

  } catch (err) {

    console.error(err);

    res.status(500).send(
      "Unable to delete submission."
    );
  }

});

/*
====================================================
DELETE SELECTED
====================================================
*/

app.post("/delete-selected", async (req, res) => {

  try {

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {

      return res.status(400).send(
        "No records selected."
      );

    }

    await pool.query(
      "DELETE FROM submissions WHERE id = ANY($1::int[])",
      [ids]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: "Unable to delete records."
    });

  }

});

/*
====================================================
DASHBOARD
====================================================
*/

app.get("/dashboard", (req, res) => {

  res.redirect("/submissions");

});

/*
====================================================
START SERVER
====================================================
*/

app.listen(PORT, "0.0.0.0", async () => {

  console.log(`Server started on port ${PORT}`);

  await initializeDatabase();

});
