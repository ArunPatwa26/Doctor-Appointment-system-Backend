import validator from 'validator'
import bycrypt from "bcrypt"
import {v2 as cloudinary} from 'cloudinary'
import doctorModel from "../models/doctorModel.js"
import jwt from "jsonwebtoken"
import appointmentModel from '../models/appointmentModel.js'
import userModel from '../models/userModel.js'


// Api for adding Doctor

const addDoctor=async (req,res)=>{
    try{

        const { name, email, password, speciality, degree,experience,  about, fees,address }=req.body
        const imageFile = req.file
        //console.log({ name, email, password, speciality, degree,experience,  about, fees,address },imageFile);
        if(!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address){
            return res.json({success:false,message:"Mising Details"})
        }
        // validating email format
        if(!validator.isEmail(email)){
            return res.json({success:false,message:"Please Enter a Valid Email"})
        }
        // validating strong password
        if(password.length<8){
            return res.json({success:false,message:"Please Enter a Strong Password"})
        }

        // hasing docter password
        const salt= await bycrypt.genSalt(10)
        const hashedPassword = await bycrypt.hash(password,salt)

        // upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"})
        const imageUrl= imageUpload.secure_url

        const doctorData ={
            name,
            email,
            image:imageUrl,
            password:hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address:JSON.parse(address),
            date:Date.now()

        }
        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()

        res.json({success:true, message:"Doctor Added"})

    }catch(error){
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

// Api for admin login
const loginAdmin = async (req,res)=>{
    try {
        
        const {email,password} =req.body
        if(email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD ){

            const token = jwt.sign(email+password,process.env.JWT_SECRET)
            res.json({success:true,token})
        }else{
            res.json({success:false,message:"Invalid Credentials"})
        }

    } catch (error) {
     console.log(error);
     res.json({success:false,message:error.message})
    
 }
}

// Api to get all docotrs list for admin panel
const allDoctors=async (req,res)=>{
    try {
        const doctors=await doctorModel.find({}).select("-password")
        res.json({success:true,doctors})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message}) 
    }
}

// Api to get All Appointments List
const appointmentAdmin=async(req,res)=>{
    try {
        const appointments=await appointmentModel.find({})
        res.json({success:true,appointments})
        
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message}) 
    }
}

// Api for Appointment cancelled
const appointmentCancel = async (req, res) => {
    try {
      const {  appointmentId } = req.body;
  
      // Fetch appointment data
      const appointmentData = await appointmentModel.findById(appointmentId);
      if (!appointmentData) {
        return res.json({ success: false, message: "Appointment not found" });
      }
  
      
      // Mark the appointment as cancelled
      appointmentData.cancelled = true;
      await appointmentData.save();
  
      const { docId, slotDate, slotTime } = appointmentData;
  
      // Fetch doctor data
      const doctorData = await doctorModel.findById(docId);
      if (!doctorData) {
        return res.json({ success: false, message: "Doctor not found" });
      }
  
      // Initialize or retrieve slots_booked
      let slots_Booked = doctorData.slots_booked || {};
  
      // Debugging: Log current slots_booked
      // console.log("Before update:", JSON.stringify(slots_Booked, null, 2));
  
      // Check if the slotDate exists in slots_booked
      if (slots_Booked[slotDate]) {
        // Filter out the slotTime from the array for the given slotDate
        slots_Booked[slotDate] = slots_Booked[slotDate].filter((slot) => slot !== slotTime);
  
        // If the array becomes empty, delete the slotDate key
        if (slots_Booked[slotDate].length === 0) {
          delete slots_Booked[slotDate];
        }
  
        // Reassign the updated slots_booked back to the doctorData
        doctorData.slots_booked = { ...slots_Booked };
  
        // Mark slots_booked as modified so Mongoose detects the change
        doctorData.markModified('slots_booked');
  
        // Save the updated doctor data
        await doctorData.save();
      }
  
      // Debugging: Log updated slots_booked
      // console.log("After update:", JSON.stringify(doctorData.slots_booked, null, 2));
  
      res.json({ success: true, message: "Appointment Cancelled" });
    } catch (error) {
      console.error("Error in cancelAppointment:", error);
      res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
  };


//   api to get dashboard data for the admin panel
const adminDashboard=async(req,res)=>{
    try {
        const doctors=await doctorModel.find({})
        const users=await userModel.find({})
        const appointments=await appointmentModel.find({})

        const dashData={
            doctors:doctors.length,
            appointments:appointments.length,
            patients:users.length,
            latestAppointments:appointments.reverse().slice(0,5)
        }
        res.json({success:true,dashData})

    } catch (error) {
        console.error("Error in cancelAppointment:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." }); 
    }
}

export {addDoctor,loginAdmin,allDoctors,appointmentAdmin,appointmentCancel,adminDashboard}