const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const approvalRoutes = require('./routes/approvalRoutes');
const financeCardsRoutes = require("./routes/financeCardsRoutes");
const elitePaymentRoutes = require("./routes/elitePaymentRoutes");
const giveawayRoutes = require("./routes/giveawayRoutes");
const cardRoutes = require("./routes/cardRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/financial', approvalRoutes);
app.use("/api/financial", financeCardsRoutes);
app.use("/api/financial", elitePaymentRoutes);
app.use("/api/financial", giveawayRoutes);
app.use("/card", cardRoutes);


// 🔍 Temporary route – check installed fonts
const { exec } = require("child_process");
app.get("/check-fonts", (req, res) => {
    exec("fc-list", (err, stdout, stderr) => {
        if (err) {
            return res.status(500).send("Error: " + (stderr || err.message));
        }
        res.type("text/plain").send(stdout);
    });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`Financial Service running on port ${PORT}`);
});
