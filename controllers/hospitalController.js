import admin from 'firebase-admin';

const db = admin.firestore();

const getHospitals = async (req, res, next) => {
  try {
    const hospitalsCollection = db.collection('HospitalDetails');
    const snapshot = await hospitalsCollection.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No hospitals found' });
    }

    const hospitals = [];
    snapshot.forEach(doc => {
      hospitals.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(hospitals);
  } catch (error) {
    next(error);
  }
};


export { getHospitals };