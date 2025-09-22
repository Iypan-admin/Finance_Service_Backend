const { supabase, supabaseAdmin } = require("../config/supabaseClient");

// ✅ Approve a Payment (Finance/Admin)
const approvePayment = async (req, res) => {
    const { payment_id } = req.body;

    if (!payment_id) {
        return res.status(400).json({ error: "Payment ID is required" });
    }

    try {
        // 1️⃣ Fetch payment details
        const { data: payment, error: fetchError } = await supabase
            .from("student_course_payment")
            .select("*")
            .eq("payment_id", payment_id)
            .single();

        if (fetchError || !payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        const {
            enrollment_id,
            course_duration,
            payment_type,
            current_emi,
            emi_duration,
        } = payment;

        // 2️⃣ Approve this payment (status: true)
        const { error: paymentError } = await supabase
            .from("student_course_payment")
            .update({ status: true })
            .eq("payment_id", payment_id);

        if (paymentError) {
            return res
                .status(500)
                .json({ error: "Error updating payment status" });
        }

        // 3️⃣ Calculate new end_date based on payment type
        let newEndDate;
        const today = new Date();

        if (payment_type === "full") {
            // Full payment → full course duration
            newEndDate = new Date();
            newEndDate.setMonth(newEndDate.getMonth() + course_duration);
        } else if (payment_type === "emi") {
            // EMI → extend 30 days from existing end_date or today
            const { data: enrollment, error: enrollmentFetchError } =
                await supabase
                    .from("enrollment")
                    .select("end_date")
                    .eq("enrollment_id", enrollment_id)
                    .single();

            if (enrollmentFetchError || !enrollment) {
                return res.status(404).json({ error: "Enrollment not found" });
            }

            // Use existing end_date if it's in future, otherwise today
            const existingEndDate = enrollment.end_date
                ? new Date(enrollment.end_date)
                : today;

            const baseDate = existingEndDate > today ? existingEndDate : today;
            newEndDate = new Date(baseDate);
            newEndDate.setDate(newEndDate.getDate() + 30);
        }

        // 4️⃣ Update enrollment table
        const { error: enrollmentError } = await supabase
            .from("enrollment")
            .update({
                status: true, // immediate course access
                end_date: newEndDate.toISOString().split("T")[0],
            })
            .eq("enrollment_id", enrollment_id);

        if (enrollmentError) {
            return res
                .status(500)
                .json({ error: "Error updating enrollment" });
        }

        res.json({ message: "Payment approved successfully" });
    } catch (err) {
        console.error("❌ Approve payment error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ✅ Get All Payments (Finance/Admin)
const getAllPayments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('student_course_payment')
            .select(`
                *,
                enrollment:enrollment (
                    enrollment_id,
                    student:students (
                        student_id,
                        email,
                        registration_number
                    ),
                    batch:batches (
                        batch_id,
                        course:courses (
                            id,
                            course_name
                        )
                    )
                )
            `);

        if (error) {
            console.error('Error fetching payments:', error);
            return res.status(500).json({ success: false, error: "Error fetching payments" });
        }

        // Flatten nested data
        const transformedData = data.map(payment => ({
            ...payment,
            student_email: payment.enrollment?.student?.email,
            registration_number: payment.enrollment?.student?.registration_number,
            course_name: payment.enrollment?.batch?.course?.course_name,
            enrollment: undefined
        }));

        res.status(200).json({ success: true, data: transformedData });

    } catch (err) {
        console.error('Error fetching payments:', err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

// ✅ Edit Payment Duration (Finance/Admin)
const editPaymentDuration = async (req, res) => {
    const { payment_id, new_course_duration } = req.body;

    if (!payment_id || new_course_duration === undefined) {
        return res.status(400).json({ success: false, error: "Payment ID and new course duration are required" });
    }

    try {
        const { data, error } = await supabase
            .from('student_course_payment')
            .update({ course_duration: Number(new_course_duration) })
            .eq('payment_id', payment_id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: "Error updating course duration" });
        }

        res.status(200).json({ success: true, message: "Course duration updated successfully", data });

    } catch (err) {
        console.error('Error editing payment duration:', err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = { approvePayment, getAllPayments, editPaymentDuration };
