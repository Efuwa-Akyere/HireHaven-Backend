import {Router} from 'express';
import { addAdmin, adminForgotPassword, adminInfo, adminLogin, adminLogout, adminResetPassword, googleAuthFailure, googleAuthSuccess, linkedinAuthFailure, linkedinAuthSuccess } from '../controller/adminController.js';
import passport from "passport";
import './../config/adminGooglePassportStrategy.js';
import './../config/adminLinkedInPassportStrategy.js';


const router = Router();

router.post('/asignup', addAdmin);
router.post('/alogin', adminLogin);
router.get('/ainfo', adminInfo);
router.post('/alogout', adminLogout);
router.post('/aforgotPassword', adminForgotPassword);
router.post('/admin/resetpassword/:resetPasswordToken', adminResetPassword)


router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/auth/google/failure'
}), googleAuthSuccess);

router.get('/google/failure', googleAuthFailure);

// LinkedIn login
router.get("/linkedin", passport.authenticate("linkedin", {
  scope: ["r_emailaddress", "r_liteprofile"]
}));

// LinkedIn callback
router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    failureRedirect: "/auth/linkedin/failure",
  }),
  linkedinAuthSuccess
);

router.get("/linkedin/failure", linkedinAuthFailure);


export default router;