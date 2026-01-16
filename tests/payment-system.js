/**
 * Test script for payment system
 * 
 * This script demonstrates how the payment system works for home care appointments
 * when a doctor marks an appointment as completed.
 */

const mongoose = require('mongoose');
const Appointment = require('../models/appointments');
const Transaction = require('../models/transaction');
const Service = require('../models/service');
const User = require('../models/user');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testPaymentSystem() {
  try {
    console.log('Starting payment system test...');
    
    // 1. Create a test service
    const service = await Service.findOne({ type: 'DOCTOR' }) || 
      await new Service({
        name: 'Home Doctor Visit',
        type: 'DOCTOR',
        basePrice: 100,
        fee: 10,
        description: 'Doctor home visit service'
      }).save();
    
    console.log('Test service:', service);
    
    // 2. Find a doctor and patient
    const doctor = await User.findOne({ role: 'DOCTOR' });
    const patient = await User.findOne({ role: 'PATIENT' });
    
    if (!doctor || !patient) {
      console.error('Test requires at least one doctor and one patient in the database');
      return;
    }
    
    console.log(`Using doctor: ${doctor.fullName} and patient: ${patient.fullName}`);
    
    // 3. Create a test appointment
    const appointment = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date: new Date(),
      time: '14:00',
      reason: 'Test appointment',
      isHomeCare: true,
      service: service._id,
      serviceType: 'HOME_DOCTOR',
      status: 'confirmed'
    });
    
    await appointment.save();
    console.log('Created test appointment:', appointment._id);
    
    // 4. Complete the appointment (this should trigger payment creation)
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointment._id,
      { 
        status: 'completed',
        'payment.amount': service.basePrice,
        'payment.fee': service.fee,
        'payment.status': 'completed',
        $push: {
          'payment.history': {
            amount: service.basePrice,
            fee: service.fee,
            status: 'completed',
            date: new Date(),
            notes: 'Payment processed on appointment completion'
          }
        }
      },
      { new: true }
    );
    
    console.log('Appointment completed with payment:', updatedAppointment.payment);
    
    // 5. Create a transaction record
    const transaction = new Transaction({
      doctor: doctor._id,
      patient: patient._id,
      amount: service.basePrice,
      fee: service.fee,
      type: 'home-care',
      appointment: appointment._id,
      status: 'completed',
      metadata: {
        serviceType: 'HOME_DOCTOR',
        completedAt: new Date()
      }
    });
    
    await transaction.save();
    console.log('Transaction created:', transaction._id);
    
    // 6. Check payment history
    const transactions = await Transaction.find({
      doctor: doctor._id,
      type: 'home-care'
    }).lean();
    
    console.log(`Found ${transactions.length} transactions for doctor`);
    console.log('Transaction details:', transactions[0]);
    
    // 7. Process withdrawal
    const withdrawal = new Transaction({
      doctor: doctor._id,
      amount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      fee: transactions.reduce((sum, tx) => sum + tx.fee, 0),
      type: 'withdrawal',
      status: 'completed',
      metadata: {
        transactionIds: transactions.map(tx => tx._id),
        transactionCount: transactions.length,
        withdrawalDate: new Date()
      }
    });
    
    await withdrawal.save();
    console.log('Withdrawal processed:', withdrawal);
    
    // 8. Update original transactions to withdrawn status
    await Transaction.updateMany(
      { _id: { $in: transactions.map(tx => tx._id) } },
      { status: 'withdrawn' }
    );
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testPaymentSystem();