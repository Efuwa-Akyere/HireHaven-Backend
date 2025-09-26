import passport from "passport";
import { Strategy as LinkedinStrategy } from "passport-linkedin-oauth2";
import Admin from "../models/admin.js";

passport.use(
  "linkedin",
  new LinkedinStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "/auth/linkedin/callback",
      scope: ["r_emailaddress", "r_liteprofile"],
      state: true,
    },
    async ( profile, done) => {
      try {
        console.log("LinkedIn profile:", profile);

        let admin = await Admin.findOne({ linkedinId: profile.id });
        if (!admin) {
          admin = new Admin({
            linkedinId: profile.id,
            username: profile.displayName,
            email: profile.emails?.[0]?.value,
            authProvider: "linkedin",
          });
          await admin.save();
        }
        done(null, admin);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((admin, done) => done(null, admin._id));
passport.deserializeUser(async (id, done) => {
  try {
    const admin = await Admin.findById(id).select("-password");
    done(null, admin);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
