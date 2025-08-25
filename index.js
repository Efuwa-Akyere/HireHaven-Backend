import express from 'express';
import connectDb from './config/db.js';

const PORT = process.env.PORT || 6000;

const app = express();
app.use(express.json());



app.listen(PORT, () => {
    connectDb();
    console.log(`port ${PORT} ready for connection`)
})