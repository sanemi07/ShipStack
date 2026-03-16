import express, { type Request, type Response } from "express"
import cors from "cors"
import { generate } from "./generate.js"
import simpleGit from "simple-git"




const app=express()


app.use(express.json())
app.use(cors())

app.get('/',(req:Request,res:Response)=>{
    res.send("hiii")
})

app.post('/deploy',async(req:Request,res:Response)=>{
    try {
        const repourl:string=req.body.repourl
        const id=generate()
        await simpleGit().clone(repourl,`output/${id}`)
        res.status(200).json({
            id:id
        })
    } catch (error) {
        return res.status(500).json(error)
    }
})

app.listen(3000)
