import {Router} from 'express';
import { addEmployer, employerInfo, employerLogin, employerLogout } from '../controller/employerController.js';

const router = Router();

router.post('/esignup', addEmployer);
router.post('/elogin', employerLogin);
router.get('/einfo', employerInfo);
router.post('/elogout', employerLogout);



export default router;