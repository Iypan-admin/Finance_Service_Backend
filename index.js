const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const approvalRoutes = require('./routes/approvalRoutes');
const financeCardsRoutes = require("./routes/financeCardsRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/financial', approvalRoutes);
app.use("/api/financial", financeCardsRoutes);

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`Financial Service running on port ${PORT}`);
});
