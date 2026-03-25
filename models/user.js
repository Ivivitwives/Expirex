const moongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new moongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: { 
        type: String, 
        required: true },
        role: {
            type: String,
            enum: ['admin', 'staff'],
            default: 'staff'
        }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    
    const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
});
        

module.exports = moongoose.model('User', userSchema);