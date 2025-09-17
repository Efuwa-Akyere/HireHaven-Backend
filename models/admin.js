import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";
import crypto from 'crypto';

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
    email: {
        type: String,
        unique: true,
        validate: {
            validator: function (value) {
                return value.includes('@')
            },
            message: (props) => `${props.value} is not a valid email`
        }
    },

    role: {
        type: String,
        enum: [ 'admin']
    },
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
    
}, {timestamps: true});



adminSchema.pre('save', async function (next) {
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

adminSchema.post('save', async function() {
    console.log('data just got saved');
});


adminSchema.methods.compareTwoPasswords = async function (inputtedPassword, dbPassword) {
    return bcrypt.compare(inputtedPassword, dbPassword)
}


adminSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(16).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').
    update(resetToken).digest('hex');
    this.resetPasswordTokenExpire = Date.now() + 7 * 60 * 60 * 1000;

    return resetToken;
    
}




const Admin = model('Admin', adminSchema);

export default Admin;