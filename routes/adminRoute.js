import {Router} from 'express';
import { addAdmin } from '../controller/adminController.js';

const router = Router();

router.post('/asignup', addAdmin);



export default router;