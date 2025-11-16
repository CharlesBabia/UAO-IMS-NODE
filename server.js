import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("."));
app.use("/js", express.static("js"));     // serve JS files
app.use("/css", express.static("."));     // serve CSS from root
app.use("/img", express.static("img"));   // if you have images


// Email route
app.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "babia.charlesblaize@gmail.com",
        pass: "lksmgoxvcnbbleyn", // your app password
      },
    });

    const info = await transporter.sendMail({
      from: "UAO-IMS <babia.charlesblaize@gmail.com>",
      to: "20220026531@my.xu.edu.ph",
      subject: "UAO-IMS Notification",
      text: "",
      html: `<p>This is a notification from <strong>UAO-IMS</strong>. Please return the equipment that you have borrowed.</p>`,
    });

    res.json({ success: true, id: info.messageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index or return.html (adjust as needed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/user.html", (req, res) => {
  res.sendFile(path.join(__dirname, "user.html"));
});

app.get("/borrow.html", (req, res) => {
  res.sendFile(path.join(__dirname, "borrow.html"));
});

app.get("/return.html", (req, res) => {
  res.sendFile(path.join(__dirname, "return.html"));
});

app.get("/penalties.html", (req, res) => {
  res.sendFile(path.join(__dirname, "penalties.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});