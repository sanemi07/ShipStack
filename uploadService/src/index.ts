import dotenv from 'dotenv'
dotenv.config()
import express from "express"
import { genertateId } from './generate.js'
import cors from "cors"
import { simpleGit } from 'simple-git'
import path, { dirname } from "path"
import { fileURLToPath } from 'url'
import { getAllFiles } from './getAllFilePath.js'
import { uploadFile } from './uploadfiletoS3.js'
import { createClient } from 'redis'








const app=express()
const publisher= createClient()
 publisher.connect()
app.use(express.json())
app.use(cors())



const __fileName=fileURLToPath(import.meta.url)
const __dirname=dirname(__fileName)
app.get('/',(req,res)=>{
res.send("hello")
})

app.post("/deploy",async(req,res)=>{
    try {
        const repourl=req.body.repourl?.toString().trim()
        const id=genertateId()
        const git=simpleGit()
        await git.clone(repourl,path.join(__dirname,`/output/${id}`))
        const files=getAllFiles(path.join(__dirname,`/output/${id}`))
       await Promise.allSettled(
  files.map(file =>
    uploadFile(file.slice(__dirname.length + 1), file)
  )
);
publisher.lPush("build-queue",id)
        res.status(200).json({id:id})
        

    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }

})








app.listen(process.env.PORT||3000)
