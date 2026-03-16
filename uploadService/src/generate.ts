import { nanoid } from "nanoid"
export const generate=()=>{
    try {
        const id:string= nanoid()
    return id
    } catch (error) {
        throw new Error()
    }

}