// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For hashing passwords

// Define the structure (blueprint) for user documents
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true, // Email is mandatory
        unique: true,   // Each email must be unique
        lowercase: true // Store emails in lowercase for consistency
    },
    password: {
        type: String,
        required: true // Password is mandatory (will be hashed)
    },
    name: {
        type: String,
        required: true // Name is mandatory
    },
    role: {
        type: String,
        required: true,
        enum: ['student', 'faculty', 'hod', 'dev'] // Role must be one of these values
    },
    // Optional fields based on role
    phone: { type: String },
    stream: { type: String }, // For student
    section: { type: String }, // For student
    usn: { type: String, unique: true, sparse: true }, // For student (unique if present)
    facultyId: { type: String, unique: true, sparse: true }, // For faculty (unique if present)
    branch: { type: String }, // For HOD
    dpUrl: { type: String, default: 'https://placehold.co/60x60/E2E8F0/4A5568?text=DP' } // Default profile picture URL
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// --- Password Hashing ---
// This function runs automatically *before* a user document is saved
UserSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Generate a 'salt'
        const salt = await bcrypt.genSalt(10);
        // Hash the password with the salt
        this.password = await bcrypt.hash(this.password, salt);
        next(); // Continue saving
    } catch (err) {
        next(err); // Pass error to Mongoose
    }
});

// --- Password Comparison Method ---
// Add a method to compare a given password with the stored hash during login
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Create the model from the schema and export it
module.exports = mongoose.model('User', UserSchema);