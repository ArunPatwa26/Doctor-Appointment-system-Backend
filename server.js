import express from 'express'
import cors from "cors"
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './routes/adminRoute.js'
import doctorRouter from './routes/doctorRoute.js'
import userRouter from './routes/userRoute.js'
import dotenv from 'dotenv';
dotenv.config();
// app config
const app=express()
const port=process.env.PORRT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors({ origin: '*' }));


// api endpoints
app.use('/api/admin',adminRouter)
app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)

app.get('/',(req,res)=>{
    res.send('क्या भाई क्या हुआ क्या कर रहे हो दोस्त?')
})
app.listen(port,()=>{
    console.log('server started ',port);
    
})