require("colors");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server Running");
});

app.listen(port, () => {
  console.log(`Hank's Car in listening to port ${port}`.blue.bold);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4mqdriq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function dbConnect() {
  try {
    await client.connect();
    console.log("Database Connected".cyan);
  } catch (error) {
    console.log(error.name, error.message);
  }
}

dbConnect();

const serviceCollection = client.db("HanksGarage").collection("services");
app.get("/services", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);
    console.log(page, size);
    const query = {};
    const cursor = serviceCollection.find(query);
    const services = await cursor
      .skip(page * size)
      .limit(size)
      .toArray();
    const count = await serviceCollection.estimatedDocumentCount();
    res.send({
      success: true,
      message: "Success",
      data: { count, services },
    });
  } catch (error) {
    res.send({
      success: false,
      message: "Request Failed",
    });
  }
});

app.get("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const service = await serviceCollection.findOne(query);
    res.send({
      success: true,
      message: "Success",
      data: service,
    });
  } catch (error) {
    res.send({
      success: false,
      message: "Request Failed",
    });
  }
});

const orderCollections = client.db("HanksGarage").collection("orders");
app.post("/orders", async (req, res) => {
  try {
    const order = req.body;
    const result = await orderCollections.insertOne(order);
    res.send({
      success: true,
      message: "Order Places Successfully .",
    });
  } catch (error) {
    res.send({
      success: false,
      message: "Operation Failed !",
    });
  }
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.send({
      message: "Unauthorized Access",
      status: 401,
    });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.USER_ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.send({
        message: "Unauthorized Access",
        status: 401,
      });
    }
    req.decoded = decoded;
    next();
  });
}

app.get("/orders", verifyJWT, async (req, res) => {
  const decoded = req.decoded;
  if (decoded.email !== req.query.email) {
    res.send({
      status: 403,
      message: "Unauthorized Email",
    });
  }
  try {
    let query = {};
    if (req.query.email) {
      query = {
        "customerDetails.email": req.query.email,
      };
    }

    const cursor = orderCollections.find(query);
    const orders = await cursor.toArray();

    res.send({
      success: true,
      message: "Success",
      data: orders,
    });
  } catch (error) {
    res.send({
      success: false,
      message: "Failed",
    });
  }
});

app.patch("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const status = req.body.status;
    const query = { _id: ObjectId(id) };
    const updatedOrder = {
      $set: {
        status: status,
      },
    };
    const result = await orderCollections.updateOne(query, updatedOrder);

    res.send({
      success: true,
      message: "Status Updated",
      data: result,
    });
  } catch (error) {
    success: false;
  }
});

app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.USER_ACCESS_TOKEN, {
    expiresIn: "1h",
  });
  res.send({ token });
});
