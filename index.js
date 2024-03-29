require('dotenv').config();
require("./dbConfig");
const express = require('express')
const app = express()
const cors = require("cors")
const port = process.env.PORT
const getRoute = require("./routes/getRoutes");
const postRoute = require("./routes/postRoutes");


app.use(express.json());
app.use(cors());
app.use("/", getRoute);
app.use("/", postRoute);

app.listen(port, () => console.log(`Example app listening on port ${port}!`))