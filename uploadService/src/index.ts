import dotenv from 'dotenv'
dotenv.config()
import express, { type Request, type Response } from "express"
import cors from "cors"
import { generate } from "./generate.js"
import { simpleGit } from "simple-git"
import path from "path"
import { getAllFiles } from "./getAllFiles.js"
import { uploadFile } from './uploadFiletoS3.js'




const app=express()


app.use(express.json())
app.use(cors())

app.get('/',(req:Request,res:Response)=>{
    const id=generate()
    
    res.json(id)
})

app.post('/deploy',async(req:Request,res:Response)=>{
    try {
        const repourl:string=req.body.repourl
        const id=generate()
        console.log(id)
        await simpleGit().clone(repourl,path.join(__dirname,`output/${id}`))
        const files=getAllFiles(path.join(__dirname,`output/${id}`))
        
          files.forEach(async file => {
          await uploadFile(file.slice(__dirname.length + 1), file);
    })
        res.status(200).json({
            id:id
        })
    } catch (error) {
        return res.status(500).json(error)
    }
})

app.listen(process.env.PORT)
