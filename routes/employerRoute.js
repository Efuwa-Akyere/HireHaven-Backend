import {Router} from 'express';
import { addEmployer } from '../controller/employerController.js';

const router = Router();

router.post('/esignup', addEmployer);



export default router;