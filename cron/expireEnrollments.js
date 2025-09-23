// file: cron/expireEnrollments.js
const { supabase } = require("../config/supabaseClient");
const cron = require("node-cron");

// ⚡ Temporary: run every 1 minute for testing
cron.schedule("0 0 * * *", async () => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("enrollment")
            .update({ status: false })
            .lt("end_date", today)
            .select(); // ✅ ensure Supabase returns updated rows

        if (error) {
            console.error("❌ Error updating expired enrollments:", error);
        } else {
            const updatedCount = data ? data.length : 0;
            console.log(`ℹ️ Expired enrollments processed: ${updatedCount}`);
        }
    } catch (err) {
        console.error("❌ Cron job error:", err);
    }
},
    { timezone: "Asia/Kolkata" }
);

console.log("🕒 Enrollment expiry cron job started (once daily at 12:00 AM IST)...");