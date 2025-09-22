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
require("./cron/expireEnrollments");

// Routes
app.use('/api/financial', approvalRoutes);
app.use("/api/financial", financeCardsRoutes);
app.use("/api/financial", elitePaymentRoutes);
app.use("/api/financial", giveawayRoutes);
app.use("/card", cardRoutes);

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`Financial Service running on port ${PORT}`);
});
