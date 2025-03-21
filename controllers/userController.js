import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import {v2 as cloudinary} from 'cloudinary'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'




// Api to register user
const registerUser=async (req,res)=>{
    try {
       
        const {name,email,password}=req.body
        if(!name || !email || !password){
            return res.json({success:false,message:"Missing Details"})
        }
        // validate email format
        if(!validator.isEmail(email)){
            return res.json({success:false,message:"enter a valid email"})
        }
        // validating strong password
        if(password.length <8){
            return res.json({success:false,message:"enter a Strong password"})

        }
        // hashing user password
        const salt=await bcrypt.genSalt(10)
        const hashPassword=await bcrypt.hash(password,salt)

        const userData={
            name,
            email,
            password: hashPassword
        }
        const newUser=new userModel(userData)
        const user =await newUser.save()
        
        const token =jwt.sign({id:user._id},process.env.JWT_SECRET)

        res.json({success:true,token})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message}) 
    }
}

    // Api for user login
    const loginUser = async (req, res) => {
        try {
            const { email, password } = req.body
            const user = await userModel.findOne({ email })  // Fix: findOne instead of find
    
            if (!user) {
                return res.json({ success: false, message: 'User does not exist' })
            }
    
            const isMatch = await bcrypt.compare(password, user.password)  // Fix: Compare password correctly
            if (isMatch) {
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
                res.json({ success: true, token })
            } else {
                res.json({ success: false, message: "Invalid Credentials" })
            }
        } catch (error) {
            console.log(error)
            res.json({ success: false, message: error.message })
        }
    }

    // Api to get user profile data
    const getProfile=async(req,res)=>{
        try {
            
            const {userId}=req.body
            const userData=await userModel.findById(userId).select('-password')

            res.json({success:true,userData})


        } catch (error) {
            console.log(error)
            res.json({ success: false, message: error.message })
        }
    }
    


// Api to update user profile
const updateProfile=async(req,res)=>{
    try {
        const {userId,name,phone,address,dob,gender}=req.body
        const imageFile=req.file

        if (!name || !phone || !dob  || !gender) {
            return res.json({success:false,message:"Data Missing"})
        }

        await userModel.findByIdAndUpdate(userId, {name,phone,address:JSON.parse(address),dob,gender})
        if(imageFile){
            // upload image to cloudinary
            const imageUpload=await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId,{image:imageURL})
        }
        res.json({success:true,message:'Profile Updated'})
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Api to book appointment
const bookAppointment = async (req, res) => {
    try {
      const { userId, docId, slotDate, slotTime } = req.body;
  
      // Fetch doctor data
      const docData = await doctorModel.findById(docId).select('-password');
  
      // Check if doctor is available
      if (!docData.available) {
        return res.json({ success: false, message: "Doctor Not Available" });
      }
  
      let slots_booked = docData.slots_booked || {};
  
      // Check if the slot is already booked
      if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot Not Available" });
      }
  
      // Check if the user has already booked the same slot
      const existingAppointment = await appointmentModel.findOne({
        userId,
        docId,
        slotDate,
        slotTime,
      });
  
      if (existingAppointment) {
        return res.json({
          success: false,
          message: "You have already booked this slot",
        });
      }
  
      // Add slot to booked slots
      if (!slots_booked[slotDate]) {
        slots_booked[slotDate] = [];
      }
      slots_booked[slotDate].push(slotTime);
  
      // Fetch user data
      const userData = await userModel.findById(userId).select('-password');
  
      // Remove slots_booked from docData
      
      delete docData.slots_booked;
  
      // Create appointment data
      const appointmentData = {
        userId,
        docId,
        userData,
        docData,
        amount: docData.fees,
        slotTime,
        slotDate,
        date: Date.now(),
      };
  
      // Save the appointment
      const newAppointment = new appointmentModel(appointmentData);
      await newAppointment.save();
  
      // Save updated slots_booked in the doctor's data
      await doctorModel.findByIdAndUpdate(docId, { slots_booked });
  
      res.json({ success: true, message: "Appointment Booked" });
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: error.message });
    }
  };


//   Api to get user appointment for frontend my-appointment
const listAppointment=async(req,res)=>{
    try {
        const {userId}=req.body
        const appointments=await appointmentModel.find({userId})

        res.json({success:true,appointments})
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message }); 
    }
}

// api to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;

    // Fetch appointment data
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Check if the user is authorized
    if (appointmentData.userId.toString() !== userId.toString()) {
      return res.json({ success: false, message: "Unauthorized action" });
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

const completePayment = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "Appointment ID is required." });
    }

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    console.log("Appointment found:", appointment); // Debugging line

    appointment.payment = true;
    await appointment.save();

    res.status(200).json({ success: true, message: "Payment marked as completed." });
  } catch (error) {
    console.error("Error completing payment:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};




  

  

export {registerUser, loginUser,getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,completePayment}