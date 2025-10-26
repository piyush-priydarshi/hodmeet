// models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/ // Basic validation for YYYY-MM-DD format
    },
    time: {
        type: String,
        required: true,
        match: /^\d{2}:\d{2}$/ // Basic validation for HH:MM format
    },
    reason: {
        type: String,
        required: true,
        trim: true // Remove extra whitespace
    },
    description: {
        type: String,
        trim: true
    },
    createdBy: { // The user who initiated the booking
        type: mongoose.Schema.Types.ObjectId, // Link to the User model
        ref: 'User', // Reference the 'User' model
        required: true
    },
    withUser: { // The user whose calendar this appointment belongs to (HOD or Faculty)
        type: mongoose.Schema.Types.ObjectId, // Link to the User model
        ref: 'User',
        required: true
    },
    // --- For single attendee meetings (when booked by student/faculty) ---
    attendeeName: { // Storing name here for easier display on calendar
        type: String
    },
    attendeeEmail: { // Storing email here for easier display/notifications
        type: String
    },
    // --- For group meetings (when booked via import) ---
    isGroupMeeting: {
        type: Boolean,
        default: false
    },
    attendees: [{ // Array to store details of multiple attendees
        _id: false, // Don't create automatic IDs for sub-documents
        name: String,
        email: String,
        phone: String // Optional
    }],
    // --- Optional meeting details ---
    gmeet: {
        type: String
    },
    venue: {
        type: String
    },
    // --- Status (Optional, can be added later) ---
    // status: {
    //     type: String,
    //     enum: ['pending', 'approved', 'cancelled', 'completed'],
    //     default: 'approved' // Or 'pending' if you add an approval step
    // }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// --- Index for efficient querying ---
// Prevent double booking for the *same person* at the *same time* on the *same date*
AppointmentSchema.index({ date: 1, time: 1, withUser: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);