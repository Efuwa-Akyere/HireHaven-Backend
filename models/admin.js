import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";


const adminSchema = new Schema({
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

adminSchema.pre('save', async function (next) {
    if(!this.isModified('password')) next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

adminSchema.post('save', async function() {
    console.log('data just got saved');
});


const Admin = model('Admin', adminSchema);

export default Admin;