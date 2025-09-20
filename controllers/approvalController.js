const { supabase, supabaseAdmin } = require("../config/supabaseClient");

// ✅ Approve a Payment (Finance/Admin)
const approvePayment = async (req, res) => {
    const { payment_id } = req.body;

    if (!payment_id) {
        return res.status(400).json({ error: "Payment ID is required" });
    }

    try {
        // 1️⃣ Fetch payment details from student_course_payment table
        const { data: payment, error: fetchError } = await supabase
            .from('student_course_payment')
            .select('*')
            .eq('payment_id', payment_id)
            .single();

        if (fetchError || !payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        const { enrollment_id, course_duration } = payment;

        // 2️⃣ Approve payment (status: true)
        const { error: paymentError } = await supabase
            .from('student_course_payment')
            .update({ status: true })
            .eq('payment_id', payment_id);

        if (paymentError) {
            return res.status(500).json({ error: "Error updating payment status" });
        }

        // 3️⃣ Update enrollment status & end_date
        const currentDate = new Date();
        const newEndDate = new Date(currentDate.setMonth(currentDate.getMonth() + course_duration));

        const { error: enrollmentError } = await supabase
            .from('enrollment')
            .update({ status: true, end_date: newEndDate.toISOString().split('T')[0] })
            .eq('enrollment_id', enrollment_id);

        if (enrollmentError) {
            return res.status(500).json({ error: "Error updating enrollment" });
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
