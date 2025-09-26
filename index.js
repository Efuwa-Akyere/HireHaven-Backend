import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import connectDb from './config/db.js';

import employerRoute from './routes/employerRoute.js'
import adminRoute from './routes/adminRoute.js'
import { errorHandler } from './middleware/errorHandling.js';
import { notFound } from './middleware/notFound.js'
import passport from './config/adminGooglePassportStrategy.js'


const PORT = process.env.PORT || 7000;

const app = express();

app.use(
    session({
        secret: 'HireHaven-session-secret',
        resave: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
)

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());


app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));



app.use('/auth', employerRoute)
app.use('/auth', adminRoute)


app.use(errorHandler);
app.use(notFound);



app.listen(PORT, () => {
    connectDb();
    console.log(`port ${PORT} ready for connection`)
})