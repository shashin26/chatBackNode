const express = require("express");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

const supabaseUrl = "https://licchqttwdokwfoiuatq.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Example route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Middleware to protect routes
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  // Just attach the token and move on — Supabase will validate it on use
  req.token = token;
  next();
}

// Sign up a new user
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    res.status(200).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sign in a user
// This is the endpoint that will be used to sign in users and generate a JWT token
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { session, user } = data; //  session contains the Supabase-issued access token
    const token = session.access_token;

    res.status(200).json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sign out a user
app.all("/signout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.status(200).json({ message: "Signed out successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Example of a protected route
app.get("/protected", authenticateToken, (req, res) => {
  res
    .status(200)
    .json({ message: "This is a protected route.", user: req.user });
});

// Example of a route to fetch products from Supabase
app.get("/products", authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await userSupabase.from("products").select("*");

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
