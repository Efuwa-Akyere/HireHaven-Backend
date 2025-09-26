import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Admin from "../models/admin.js";

passport.use(new GoogleStrategy(
    {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        console.log("profile---------", profile)
        console.log("accessToken---------", accessToken)
        console.log("refreshToken---------", refreshToken)


        try {
            let admin = await Admin.findOne({googleId: profile.id});

            if(admin) {
                return done(null, admin);
            }

            admin = await Admin.findOne({email: profile.emails[0].value});

            

            const newAdmin = new Admin({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value,
                authProvider: 'google'
            });

            await newAdmin.save();

            return done(null, newAdmin)
        } catch (error) {
            console.log(error);
            return done(error, null);
        }
    }
));

passport.serializeUser((admin, done) => {
    done(null, admin._id)
});

passport.deserializeUser(async (id, done) => {
    try {
        const admin = await Admin.findById(id).select('-password');
        done(null, admin);
    } catch (error) {
        done(error, null);
    }
});

export default passport;