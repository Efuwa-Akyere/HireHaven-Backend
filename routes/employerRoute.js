import {Router} from 'express';
import { addEmployer, employerForgotPassword, employerInfo, employerLogin, employerLogout, employerResetPassword } from '../controller/employerController.js';

const router = Router();

router.post('/esignup', addEmployer);
router.post('/elogin', employerLogin);
router.get('/einfo', employerInfo);
router.post('/elogout', employerLogout);
router.post('/eforgotpassword', employerForgotPassword);
router.post('/employer/resetpassword/:resetPasswordToken', employerResetPassword);




export default router;