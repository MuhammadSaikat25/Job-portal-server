const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
app.use("/uploads", express.static("uploads"));
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
    const markJob = client.db("Job-Portal").collection("markJob");
    const AppliedJob = client.db("Job-Portal").collection("AppliedJob");
    const CandidateProfile = client.db("Job-Portal").collection("CandidateProfile");
    

    // ! multer ------------------------------
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "./uploads");
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
      },
    });

    const upload = multer({ storage: storage });
    // ! upload pdf
    app.post(
      "/uploadFile/:email",
      upload.single("pdf"),
      VerifyJwt,
      async (req, res) => {
        const candidateEmail = req.params.email;
        const {
          candidateImg,
          applyDate,
          candidateJob,
          companyEmail,
          careerLevel,
          candidateName,
          company,
          jobId,
          companyImg,
          jobDescription,
          expareanice,
          postDate,
          position,
          offeredSalary,
          deadline,
          country,
          jobType,
          jobsTitle,
        } = req.body;
        const pdf = req.file.filename;
        const data = {
          candidateImg,
          candidateJob,
          applyDate,
          candidateName,
          companyEmail,
          pdf,
          careerLevel,
          company,
          companyImg,
          jobDescription,
          expareanice,
          postDate,
          position,
          offeredSalary,
          deadline,
          country,
          jobType,
          jobsTitle,
          jobId,
          companyEmail,
          candidateEmail,
          status: "pending",
          applyDate,
        };
        const result = await AppliedJob.insertOne(data);
        res.send(result);
      }
    );

    // ! Verify Employer
    const VerifyEmployer = async (req, res, next) => {
      const email = req.decode.email;

      const query = { email: email };
      const findUser = await Users.findOne(query);
      const Employer = findUser.role === "Employer";
      if (!Employer) {
        return res.status(401).send("forbidden access");
      }
      next();
    };
    // ! get user applied job
    app.get(`/userAppliedJob/:email`, VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { candidateEmail: email };
      const result = await AppliedJob.find(query).toArray();
      res.send(result);
    });
    // ! increment applied number when any one applied in a job
    app.patch(`/addApplied/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDov = {
        $inc: {
          applied: 1,
        },
      };
      const result = await Jobs.updateOne(query, updateDov);
    });
    // ! get user
    app.get("/getUser/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await Users.findOne(query);
      res.send(result);
    });
    // ! get employer's all Applicant
    app.get(
      "/getAllApplicant/:email",
      VerifyJwt,
      VerifyEmployer,
      async (req, res) => {
        const email = req.params.email;
        const query = { companyEmail: email };
        const ApprovedQuery={companyEmail: email ,status:"Approved"}
        const RejectQuery={companyEmail: email ,status:"Reject"}
        const ApproveResult=await AppliedJob.find(ApprovedQuery).toArray()
        const RejectResult=await AppliedJob.find(RejectQuery).toArray()
        const result = await AppliedJob.find(query).toArray();
        const data={
          AllData:result,ApproveResult,RejectResult
        }
        res.send(data);
      }
    );
    // ! get login user
    app.get("/loginUser/:email", VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await CandidateProfile.findOne(query);
      res.send(result);
    });
    //  ! Employer's posted job
    app.get(
      `/Employers/:email`,
      VerifyJwt,
      VerifyEmployer,
      async (req, res) => {
        const email = req.params.email;
        const query = { companyEmail: email };
        const result = await Jobs.find(query).toArray();
        res.send(result);
      }
    );
    // ! Post User Into db
    app.post("/postUser", async (req, res) => {
      const data = await req.body;
      const result = await Users.insertOne(data);
      res.send(result);
    });
    // ! Post  Company profile data
    app.post(
      "/postCompanyData",
      VerifyJwt,
      VerifyEmployer,
      async (req, res) => {
        const data = req.body;
        const result = await CompanyProfile.insertOne(data);
        res.send(result);
      }
    );
    // ! Reject and Approved Applicant 
    app.patch(`/approvedApplicant/:id`,VerifyJwt,VerifyEmployer,async(req,res)=>{
      const id=req.params.id 
      const data=req.body
      const query={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          status:data.status
        }
      }
      const result=await AppliedJob.updateOne(query,updateDoc)
      res.send(result)
    })
    // ! delete candidate short listed Job
    app.delete(`/deletedSortListJob/:id`, VerifyJwt, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await markJob.deleteOne(query);
      res.send(result);
    });
    // ! get Single Mark Job
    app.get(`/getSingleMarkJob/:id`, VerifyJwt, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await markJob.findOne(query);
      res.send(result);
    });
    // ! post new job
    app.post("/postJob", VerifyJwt, VerifyEmployer, async (req, res) => {
      const data = req.body;
      const result = await Jobs.insertOne(data);
      res.send(result);
    });
    // ! Book mark a job
    app.post("/markJob", async (req, res) => {
      const data = req.body;
      const result = await markJob.insertOne(data);
      res.send(result);
    });
    // ! get candidate's mark job
    app.get(`/markJob/:email`, VerifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { candidate: email };
      const result = await markJob.find(query).toArray();
      res.send(result);
    });
    // ! get a single job
    app.get(`/getSingleJob/:id`, VerifyJwt, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await Jobs.findOne(query);
      res.send(result);
    });
    // ! post Employer Profile
    app.post(`/PostCandidateProfile`, VerifyJwt, async (req, res) => {
      const data = req.body;
      const result = await CandidateProfile.insertOne(data);
      res.send(result);
    });
    // ! get company profile
    app.get(
      "/getCompany/:email",
      VerifyJwt,
      VerifyEmployer,
      async (req, res) => {
        const email = req.params.email;
        const query = { email };
        const result = await CompanyProfile.findOne(query);
        res.send(result);
      }
    );
    // ! get all jobs
    app.get(`/allJobs`, async (req, res) => {
      const result = await Jobs.find().toArray();
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
