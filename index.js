const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());
app.get("/", (req, res) => {
  res.send("Welcome to job portal");
});

const VerifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT, (error, decode) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decode = decode;
    // console.log(decode)
    next();
  });
};

//  ! -------------- connect with mongodb-----------------
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2lihpnz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const Users = client.db("Job-Portal").collection("Users");
    const CompanyProfile = client.db("Job-Portal").collection("CompanyProfile");
    const Jobs = client.db("Job-Portal").collection("Jobs");
    // ! verify Candidate
    const VerifyCandidate = async (req, res, next) => {
      const email = req.decode.email;
     
      const query = { email: email };
      const findUser = await Users.findOne(query);
      const Candidate = findUser.role === "Candidate";
      if (!Candidate) {
        return res.status(401).send("forbidden access");
      }
      next();
    };
    // ! get user
    app.get("/getUser/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await Users.findOne(query);
      res.send(result);
    });
    // ! Post User Into db
    app.post("/postUser", async (req, res) => {
      const data = await req.body;
      const result = await Users.insertOne(data);
      res.send(result);
    });
    // ! Post  Company profile data
    app.post("/postCompanyData", VerifyJwt,VerifyCandidate, async (req, res) => {
      const data = req.body;
      const result = await CompanyProfile.insertOne(data);
      res.send(result);
    });
    app.post('/postJob',VerifyJwt,VerifyCandidate,async(req,res)=>{
      const data=req.body 
      const result=await Jobs.insertOne(data)
      res.send(result)
    })
    // ! get company profile
    app.get("/getCompany/:email", VerifyJwt,VerifyCandidate,VerifyCandidate, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await CompanyProfile.findOne(query);
      res.send(result);
    });
    // ! create jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT, { expiresIn: "1d" });
      res.send({ token });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("welcome");
});

app.listen(port);
