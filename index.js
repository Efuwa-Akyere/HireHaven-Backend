import express from 'express';
import cors from 'cors';
import connectDb from './config/db.js';
import cookieParser from 'cookie-parser';
import employerRoute from './routes/employerRoute.js'
import adminRoute from './routes/adminRoute.js'
import { errorHandler } from './middleware/errorHandling.js';
import {notFound} from './middleware/notFound.js'

const PORT = process.env.PORT || 7000;

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(cookieParser());


app.use('/auth',employerRoute)
app.use('/auth', adminRoute)


app.use(errorHandler);
app.use(notFound);



app.listen(PORT, () => {
    connectDb();
    console.log(`port ${PORT} ready for connection`)
})