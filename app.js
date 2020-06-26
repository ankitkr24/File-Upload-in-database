const express=require('express')
const bodyParser=require('body-parser')
const path=require('path')
const crypto=require('crypto')
const mongoose=require('mongoose')
const multer=require('multer')
const GridFsStorage=require('multer-gridfs-storage')
const Grid=require('gridfs-stream')
const methodOverride=require('method-override')
const { assert } = require('console')


const app=express()

app.use(bodyParser.json())
app.use(methodOverride('_method'))
app.set('view engine','ejs')

const mongoURI='mongodb://127.0.0.1:27017/File-upload-api'
const conn=mongoose.createConnection(mongoURI,
    { useNewUrlParser: true, useUnifiedTopology: true})


let gfs;
conn.once("open", () => {
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
});
// create storage engine 
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString("hex") + path.extname(file.originalname);
          const fileInfo = {
            filename: file.originalname,
            bucketName: "uploads"
          };
          resolve(fileInfo);
        });
      });
    }
  });
// const storage = new GridFsStorage({ url : mongoURI})
  const upload = multer({
    storage
  });


  app.get("/", (req, res) => {
    if(!gfs) {
      console.log("some error occured, check connection to db");
      res.send("some error occured, check connection to db");
      process.exit(0);
    }
    gfs.find().toArray((err, files) => {
      // check if files
      if (!files || files.length === 0) {
        return res.render("index", {
          files: false
        });
      } else {
        const f = files
          .map(file => {
            if (
              file.contentType === "image/png" ||
              file.contentType === "image/jpeg"
            ) {
              file.isImage = true;
            } else {
              file.isImage = false;
            }
            return file;
          })
          .sort((a, b) => {
            return (
              new Date(b["uploadDate"]).getTime() -
              new Date(a["uploadDate"]).getTime()
            );
          });
  
        return res.render("index", {
          files: f
        });
      }
    });
  });
app.post('/upload',upload.single('file'),(req,res)=>{
    // res.json({file: req.file})
    res.redirect('/')
})



app.get("/image/:filename", (req, res) => {
    // console.log('id', req.params.id)
    const file = gfs
      .find({
        filename: req.params.filename
      })
      .toArray((err, files) => {
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: "no files exist"
          });
        }
        gfs.openDownloadStreamByName(req.params.filename).pipe(res);
      });
  });
  app.post("/files/del/:id", (req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) return res.status(404).json({ err: err.message });
      res.redirect("/");
    });
  });
const port=5000

app.listen(port,()=>console.log('server started on port '+ port))