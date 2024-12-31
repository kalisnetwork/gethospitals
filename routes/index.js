import express from 'express';
import { getNearbyDriversAndHospitals, index } from '../controllers/driverController.js';

const createRoutes = (admin) => {
    const router = express.Router();
    const db = admin.firestore();

    // Hospital List route
    router.get('/get-hospitals', async (req, res, next) => { // Changed route
        try {
            const hospitalsCollection = db.collection('HospitalDetails');
            const snapshot = await hospitalsCollection.get();

            if (snapshot.empty) {
                return res.status(404).json({ message: 'No hospitals found' });
            }

            const hospitals = [];
            snapshot.forEach((doc) => {
                hospitals.push({
                    id: doc.id,
                    ...doc.data(),
                });
            });

             res.status(200).json({ success: true, message: 'Hospitals retrieved successfully', data: hospitals });
        } catch (error) {
            next(error);
        }
    });


    // Nearby drivers and hospitals route
    router.get('/nearby-drivers-and-hospitals', getNearbyDriversAndHospitals);

     // All drivers route
    router.get('/drivers', index);


    return router;
};

export default createRoutes;
