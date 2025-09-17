import {Router} from 'express';
import { addAdmin, adminForgotPassword, adminInfo, adminLogin, adminLogout, adminResetPassword } from '../controller/adminController.js';

const router = Router();

router.post('/asignup', addAdmin);
router.post('/alogin', adminLogin);
router.get('/ainfo', adminInfo);
router.post('/alogout', adminLogout);
router.post('/aforgotPassword', adminForgotPassword);
router.post('/admin/resetpassword/:resetPasswordToken', adminResetPassword)



export default router;