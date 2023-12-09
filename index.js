const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const port = process.env.PORT || 5000
app.use(express.json())
app.use(cors())
app.get('/', (req, res) => {
  res.send('Welcome to job portal')
})

//  ! -------------- connect with mongodb-----------------
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2lihpnz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const Users = client.db('Job-Portal').collection('Users')
    // ! Post User Into db
    app.post('/postUser',async(req,res)=>{
      const data=await req.body
      const result=await Users.insertOne(data)
      res.send(result)
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',async(req,res)=>{
    
    res.send('welcome')
})

app.listen(port)