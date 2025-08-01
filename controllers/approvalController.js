const supabase = require('../config/supabaseClient');

// ✅ Approve a Payment
const approvePayment = async (req, res) => {
    const { transaction_id } = req.body;

    if (!transaction_id) {
        return res.status(400).json({ error: "Transaction ID is required" });
    }

    // Fetch transaction details
    const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_id', transaction_id)
        .single();

    if (error || !transaction) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    const { enrollment_id, duration } = transaction;

    // Approve payment (Set status to true)
    const { error: paymentError } = await supabase
        .from('transactions')
        .update({ status: true })
        .eq('payment_id', transaction_id);

    if (paymentError) {
        return res.status(500).json({ error: "Error updating payment status" });
    }

    // Calculate new end date for enrollment
    const currentDate = new Date();
    const newEndDate = new Date(currentDate.setMonth(currentDate.getMonth() + duration));

    // Update enrollment status & end_date
    const { error: enrollmentError } = await supabase
        .from('enrollment')
        .update({ status: true, end_date: newEndDate.toISOString().split('T')[0] })
        .eq('enrollment_id', enrollment_id);

    if (enrollmentError) {
        return res.status(500).json({ error: "Error updating enrollment" });
    }

    res.json({ message: "Payment approved successfully" });
};

// ✅ Get All Transactions
const getAllTransactions = async (req, res) => {
    const { data, error } = await supabase
        .from('transactions')
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
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ 
            success: false,
            error: "Error fetching transactions" 
        });
    }

    // Transform the response to flatten the nested structure
    const transformedData = data.map(transaction => ({
        ...transaction,
        student_email: transaction.enrollment?.student?.email,
        registration_number: transaction.enrollment?.student?.registration_number,
        course_name: transaction.enrollment?.batch?.course?.course_name,
        // Remove nested objects to clean up the response
        enrollment: undefined
    }));

    res.status(200).json({
        success: true,
        data: transformedData
    });
};

// ✅ Edit Transaction Duration
const editTransaction = async (req, res) => {
    const { transaction_id, new_duration } = req.body;

    if (!transaction_id || !new_duration) {
        return res.status(400).json({ 
            success: false,
            error: "Transaction ID and new duration are required" 
        });
    }

    try {
        // Update the transaction duration
        const { data, error } = await supabase
            .from('transactions')
            .update({ duration: new_duration })
            .eq('payment_id', transaction_id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ 
                success: false,
                error: "Error updating transaction duration" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Duration updated successfully",
            data: data
        });

    } catch (error) {
        console.error('Error editing transaction:', error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

module.exports = { approvePayment, getAllTransactions, editTransaction };
