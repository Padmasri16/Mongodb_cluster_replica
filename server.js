const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");

let { MongoClient } = require("mongodb");

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "key to cookie",
    resave: false,
    saveUninitialized: false,
  })
);

const regex =
  /^mongodb(?:\+srv)?:\/\/(?:[^:@\/\s]+(?::[^@\/\s]+)?@)?[^\s\/]+(?:\/[a-zA-Z0-9_-]*)?(?:\?.*)?$/;

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index1.html"));
});

app.post("/cluster.js", async function (req, res) {
  const con_string = req.body.con_string;
  req.session.con_string = con_string;
  if (!regex.test(req.session.con_string)) {
    return res
      .status(400)
      .send(`Invalid connection string: ${req.session.con_string}`);
  }

  try {
    const client = new MongoClient(req.session.con_string);
    await client.connect();
    let dbList = await client.db().admin().listDatabases();
    await client.close();

    let dbases = `<h1>List of Databases</h1><ul>`;
    dbList.databases.forEach((db) => {
      dbases += `<li>${db.name}
        <form action="/collections/${db.name}" method="get" style="display:inline">
          <button type="submit">Show Collections</button>
        </form>
      </li><br>`;
    });
    dbases += `</ul><br><button>Create New Database</button><br><br>`;
    dbases += `<form action="/" method="get">
  <input type="hidden" name="con_string" value="${req.session.con_string}">
  <button type="submit">Back</button>
</form>`;

    res.send(dbases);
  } catch (err) {
    console.error(err);

    res.status(500).send("Failed to connect to MongoDB or fetch databases");
  }
});

app.get("/collections/:dbname", async function (req, res) {
  const dbname = req.params.dbname;
  if (!req.session.con_string) {
    return res.status(400).send("Missing MongoDB connection string");
  }

  try {
    const client = new MongoClient(req.session.con_string);
    await client.connect();

    let db = client.db(dbname);
    const collections = await db.listCollections().toArray();
    await client.close();

    let collection = `<h1>Collections in Database - ${dbname}</h1><ul>`;
    collections.forEach((col) => {
      collection += `<li>${col.name}
      <form action="/documents/${dbname}/${col.name}" method="get" style="display:inline">
          <button type="submit">Show Documentss</button>
        </form>
     <br></li><br>`;
    });
    collection += `</ul><br><button>Create New Collection</button><br><br>`;
    collection += `<form action="/cluster.js" method="post">
  <input type="hidden" name="con_string" value="${req.session.con_string}">
  <button type="submit">Back</button>
</form>`;

    res.send(collection);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching collections");
  }
});
app.get("/documents/:dbName/:colname", async function (req, res) {
  const dbName = req.params.dbName;
  const colName = req.params.colname;
  if (!req.session.con_string) {
    console.log("Connection string is missing");
  }
  try {
    const client = new MongoClient(req.session.con_string);
    await client.connect();
    let collection = client.db(dbName).collection(colName);
    let doc = await collection.find().toArray();
    await client.close();
    let mydoc = `<h1>Database Name : ${dbName}<br>Collection Name : ${colName}</h1><br>Documents are Listed Below:<br><ul>`;
    doc.forEach((onedoc) => {
      mydoc += `<li><pre>${JSON.stringify(onedoc, null, 2)}</pre></li><br>`;
    });
    mydoc += `</ul><br><button>Create New Document</button><br><br>`;
    mydoc += `<form action="/collections/${dbName}" method="get">
  <input type="hidden" name="con_string" value="${req.session.con_string}">
  <button type="submit">Back</button>
</form>`;
    res.send(mydoc);
  } catch (err) {
    console.error(err);
    return res.status(500).send(`Error fetching Documents ${err}`);
  }
});
app.listen(3000, () => console.log("Server running at port 3000"));
