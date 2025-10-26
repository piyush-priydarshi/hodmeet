// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session'); // For managing user sessions
const passport = require('passport'); // For authentication handling
const LocalStrategy = require('passport-local').Strategy; // For email/password login
const User = require('./models/User'); // Import the User model
const Appointment = require('./models/Appointment'); // Import the Appointment model

const app = express();
const PORT = 5001;

// --- Database Connection ---
// Your connection string with the @ symbol encoded as %40 in the password
const dbURI = 'mongodb+srv://piyush_pr:Piush%4000000@cluster0.rdikfet.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(dbURI)
  .then(() => {
    console.log('✅ MongoDB connected successfully.');
    createInitialUsers(); // Create initial users if they don't exist
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
// --- End Database Connection ---

// --- Middleware ---
app.use(cors({
    origin: 'http://127.0.0.1:3000', // Allow requests from your frontend
    credentials: true // Allow cookies/session info to be sent
}));
app.use(express.json()); // Parse incoming JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies

// --- Session Setup (MUST be BEFORE Passport initialization) ---
// UPDATED with sameSite: 'none' and secure: true (for testing cross-site behavior)
app.use(session({
    secret: 'replace_this_with_a_real_strong_secret_key_12345!', // IMPORTANT: Use a long, random string!
    resave: false,             // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: { // <-- UPDATED THIS BLOCK
        secure: true, // Required for sameSite: 'none' (Browsers *might* allow on localhost/127.0.0.1, but often requires HTTPS setup even locally)
        httpOnly: true, // Keep this true for security (recommended)
        sameSite: 'none', // Allow cookie to be sent on cross-site requests
        path: '/'      // Explicitly set cookie path to root
        // maxAge: 1000 * 60 * 60 * 24 // Optional: expire cookie after 1 day (in milliseconds)
    }
}));
// --- End Session Setup ---

// --- Passport Initialization ---
app.use(passport.initialize()); // Initialize Passport
app.use(passport.session());    // Allow Passport to use Express sessions
// --- End Passport Initialization ---

// --- Passport Local Strategy Configuration ---
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) { return done(null, false, { message: 'Incorrect email or password.' }); }
            const isMatch = await user.comparePassword(password);
            if (!isMatch) { return done(null, false, { message: 'Incorrect email or password.' }); }
            return done(null, user);
        } catch (err) { return done(err); }
    }
));
// --- End Passport Local Strategy ---

// --- Passport Session Management ---
passport.serializeUser((user, done) => {
    console.log(`~~ Serializing user: ${user.email} (ID: ${user.id})`); // Log serialization
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    console.log(`~~ Deserializing user with ID: ${id}`); // Log deserialization start
    try {
        const user = await User.findById(id);
        if (user) {
            console.log(`~~ Deserialized user found: ${user.email}`); // Log success
        } else {
            console.log(`~~ Deserialized user NOT found for ID: ${id}`); // Log failure
        }
        done(null, user); // Pass user (or null if not found) to Passport
    } catch (err) {
        console.error(`~~ Error during deserialization for ID ${id}:`, err); // Log error
        done(err);
    }
});
// --- End Passport Session Management ---

// --- Function to Create Initial Users ---
async function createInitialUsers() {
    const initialUsers = [
        { email: 'keshav1cse@cmrit.ac.in', password: '123', name: 'Keshav Sir', role: 'hod', branch: 'CSE' },
        { email: 'kavyashree100@cmrit.ac.in', password: '123', name: 'Kavyashree Ma\'am', role: 'faculty', facultyId: '12394FJ' },
        { email: 'piyush.cse24@cmrit.ac.in', password: '123', name: 'Piyush', role: 'student', stream: 'CSE', section: 'B', usn: '1CR24CS127' }
    ];
    try {
        for (const userData of initialUsers) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const newUser = new User(userData);
                await newUser.save();
                console.log(`✅ Initial user '${userData.email}' created successfully.`);
            } else {
                console.log(`ℹ️ Initial user '${userData.email}' already exists.`);
            }
        }
    } catch (error) {
        console.error('❌ Error creating initial users:', error);
    }
}
// --- End Function ---

// --- Basic Test Route ---
app.get('/', (req, res) => { res.send('HoDMeet Backend says Hello! 👋'); });

// --- Authentication Routes ---

// LOGIN Route (POST request) - Includes req.session.save()
app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { console.error("Login Error:", err); return next(err); }
        if (!user) { return res.status(401).json({ message: info.message || 'Login failed. Incorrect email or password.' }); }
        req.logIn(user, (err) => {
            if (err) { console.error("Session establishment error:", err); return next(err); }
            req.session.save((saveErr) => {
                if (saveErr) { console.error("Session save error:", saveErr); return next(saveErr); }
                const userInfo = { id: user._id, email: user.email, name: user.name, role: user.role, dpUrl: user.dpUrl };
                console.log(`Session saved (ID: ${req.sessionID}), sending login success for: ${user.email}`);
                return res.json({ message: 'Login successful!', user: userInfo });
            });
        });
    })(req, res, next);
});

// LOGOUT Route (POST request)
app.post('/api/auth/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { console.error("Logout error:", err); return next(err); }
    req.session.destroy((err) => {
        if (err) { console.error("Session destroy error:", err); }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful!' });
    });
  });
});

// STATUS Check Route (GET request) - Includes logging
app.get('/api/auth/status', (req, res) => {
    console.log(`--> /api/auth/status requested. SessionID: ${req.sessionID}. IsAuthenticated: ${req.isAuthenticated()}`);
    if (req.user) { console.log(`    User in session: ${req.user.email}`); }
    else { console.log(`    No user in session.`); }
    if (req.isAuthenticated()) {
         const userInfo = { id: req.user._id, email: req.user.email, name: req.user.name, role: req.user.role, dpUrl: req.user.dpUrl };
        res.json({ isAuthenticated: true, user: userInfo });
    } else {
        res.json({ isAuthenticated: false, user: null });
    }
});
// --- End Authentication Routes ---


// --- Middleware for Protecting Routes --- - Includes detailed logging
function ensureAuthenticated(req, res, next) {
    console.log(`--> ensureAuthenticated checking request for: ${req.method} ${req.originalUrl}`);
    console.log(`    Session ID: ${req.sessionID}`);
    console.log(`    req.user before check: ${req.user ? req.user.email : 'undefined'}`);
    const authStatus = req.isAuthenticated();
    console.log(`    Result of req.isAuthenticated(): ${authStatus}`);
    if (authStatus) {
        console.log(`    User IS Authenticated: ${req.user.email}`);
        return next();
    }
    console.log(`    User IS NOT Authenticated. Sending 401.`);
    res.status(401).json({ message: 'Unauthorized. Please log in.' });
}
// --- End Middleware ---


// --- API Routes for Appointments ---

// GET My Appointments (Protected Route) - Includes logging
app.get('/api/appointments/my', ensureAuthenticated, async (req, res) => {
    console.log(`--> Reached /api/appointments/my route handler for user: ${req.user.email}`);
    try {
        const userId = req.user._id;
        const userEmail = req.user.email;
        const appointments = await Appointment.find({
            $or: [ { createdBy: userId }, { withUser: userId }, { 'attendees.email': userEmail } ]
        })
        .populate('createdBy', 'name role email')
        .populate('withUser', 'name role email')
        .sort({ date: 1, time: 1 });

        const formattedAppointments = appointments.map(appt => {
            let withPerson = 'Unknown', withRoleLabel = '';
            if(!appt.createdBy || !appt.withUser) { console.warn("Appt missing refs:", appt._id); return null; }
            if (appt.isGroupMeeting) {
                withPerson = appt.createdBy.name; withRoleLabel = appt.createdBy.role === 'hod' ? '(HOD)' : '(Faculty)';
            } else if (appt.createdBy._id.equals(userId)) {
                withPerson = appt.withUser.name; withRoleLabel = appt.withUser.role === 'hod' ? '(HOD)' : '(Faculty)';
            } else if (appt.withUser._id.equals(userId)) {
                 withPerson = appt.attendeeName || appt.createdBy.name; withRoleLabel = appt.createdBy.role === 'hod' ? '(HOD)' : (appt.createdBy.role === 'faculty' ? '(Faculty)' : '(Student?)');
             } else if (appt.attendees && appt.attendees.some(att => att.email === userEmail)) {
                 withPerson = `Group hosted by ${appt.createdBy.name}`; withRoleLabel = appt.createdBy.role === 'hod' ? '(HOD)' : '(Faculty)';
             }
            return {
                id: appt._id, with: `${withPerson} ${withRoleLabel}`.trim(), date: appt.date, time: appt.time,
                reason: appt.reason, description: appt.description || '', gmeet: appt.gmeet || null, venue: appt.venue || null,
                createdBy: appt.createdBy.email, isGroupMeeting: appt.isGroupMeeting, attendeeCount: appt.attendees ? appt.attendees.length : 1,
                notice: appt.isGroupMeeting ? `Group session with ${appt.attendees.length} attendees.` : null
            };
        }).filter(appt => appt !== null);
        res.json(formattedAppointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Failed to fetch appointments.' });
    }
});
// --- End Appointment Routes ---

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server is listening on http://localhost:${PORT}`);
});