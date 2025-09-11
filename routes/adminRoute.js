import {Router} from 'express';
import { addAdmin, adminInfo, adminLogin, adminLogout } from '../controller/adminController.js';

const router = Router();

router.post('/asignup', addAdmin);
router.post('/alogin', adminLogin);
router.get('/ainfo', adminInfo);
router.post('/alogout', adminLogout);



export default router;