import express from 'express'
import { appointmentCancel, appointmentComplete, appointmentsDoctor, doctorDashboard, doctorList, doctorProfile, loginDoctor, updateDoctorProfile } from '../controllers/doctorController.js'
import authDoctor from '../middlewares/authDoctor.js'

const doctorRouter = express.Router()

doctorRouter.get('/list',doctorList)
doctorRouter.post('/login',loginDoctor)
doctorRouter.get('/appointments',authDoctor,appointmentsDoctor)
doctorRouter.post('/appointment-complete',authDoctor,appointmentComplete)
doctorRouter.post('/appointment-cancel',authDoctor,appointmentCancel)
doctorRouter.post('/update-profile',authDoctor,updateDoctorProfile)
doctorRouter.get('/profile',authDoctor,doctorProfile)
doctorRouter.get('/dashboard',authDoctor,doctorDashboard)

export default doctorRouter