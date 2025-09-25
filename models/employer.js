import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";


const employerSchema = new Schema({
    username:{
        type: String,
        minLength: [4, 'Username must be at least 4 characters'],
        required: true,
    },
    
    password:{
        type: String,
        minLength:[5, 'Password must be more than 4 characters'],
        required: true,
    },

    role: {
        type: String,
        enum: ['user', 'employer', 'admin']
    },
    
}, {timestamps: true});

employerSchema.pre('save', async function (next) {
    if(!this.isModified('password')) next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

employerSchema.post('save', async function() {
    console.log('data just got saved');
});


const Employer = model('Employer', employerSchema);

export default Employer;

