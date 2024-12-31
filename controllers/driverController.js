import admin from 'firebase-admin';
import axios from 'axios';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
};

const apiKey = "AIzaSyC7I30Cct18-tCJ09yRu3k0NBjPEwKl1Qs";

export const getNearbyDriversAndHospitals = async (req, res) => {
    const { latitude, longitude } = req.query;
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radius = 5;

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    try {
        const db = admin.firestore();
        // Fetch online drivers
        const driversSnapshot = await db.collection('driver_users').where('isOnline', '==', true).get();
         console.log("Drivers snapshot: ", driversSnapshot);

        const onlineDrivers = driversSnapshot.docs.map(doc => {
            const driverData = doc.data();
            console.log("Driver data: ", driverData);
            const driverLat = driverData.location?.latitude;
            const driverLon = driverData.location?.longitude;


            if (driverLat && driverLon) {
                const distance = calculateDistance(userLat, userLon, driverLat, driverLon);
                return {
                   ...driverData,
                    id: doc.id,
                   distance: distance
                };
            }
             return null;
           }).filter(driver => driver && driver.distance <= radius).sort((a,b) => a.distance - b.distance);


        // Fetch hospitals from Google Maps Places API
        const hospitalsResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=emergency+multispeciality+hospital+in+near+${userLat},${userLon}&radius=${radius*1000}&key=${apiKey}`
        );

        if (hospitalsResponse.data.status !== 'OK') {
            console.error("Text Search Failed with status: ", hospitalsResponse.data.status);
            return res.json({ drivers: onlineDrivers, hospitals: []});
        }
        const hospitals = [];
        const places = hospitalsResponse.data.results;
       for (const place of places) {
           const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${apiKey}&fields=name,formatted_address,formatted_phone_number,rating,geometry,photos`;
          try {
            const placeDetailsResponse = await axios.get(placeDetailsUrl);
            if(placeDetailsResponse.data.status === 'OK'){
                const placeDetails = placeDetailsResponse.data.result;
               hospitals.push({
                    id: place.place_id,
                   name: placeDetails.name,
                    address: placeDetails.formatted_address,
                    phone: placeDetails.formatted_phone_number || null,
                    latitude: placeDetails.geometry.location.lat,
                     longitude: placeDetails.geometry.location.lng,
                    rating: placeDetails.rating || null,
                    imageUrl: placeDetails.photos && placeDetails.photos.length > 0
                     ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${placeDetails.photos[0].photo_reference}&key=${apiKey}`
                        : null,
                  distance: calculateDistance(userLat, userLon, placeDetails.geometry.location.lat, placeDetails.geometry.location.lng)
                 })
              }
            } catch (detailsError) {
                console.error("Error fetching place details:", detailsError);
            }
       }
       hospitals.sort((a,b) => a.distance-b.distance)
        res.json({
            drivers: onlineDrivers,
            hospitals: hospitals
        });
    } catch (error) {
        console.error("Error fetching nearby drivers and hospitals:", error);
        res.status(500).json({ error: "Failed to fetch nearby drivers and hospitals" });
    }
};


export const index = async (req, res) => {
  try {
     const driversRef = admin.firestore().collection('driver_users');
      const snapshot = await driversRef.get();
      if (snapshot.empty) {
            return res.status(404).json({ message: 'No drivers found' });
       }
       const drivers = [];
        snapshot.forEach(doc => {
           drivers.push({ id: doc.id, ...doc.data() });
       });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
};