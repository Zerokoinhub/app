const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "zerokoin-4e239",
  "private_key_id": "e35ff1eb557a6fc234773b10460691741ee5bedc",
  "private_key": `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDREazAgqIozN2L
gA/wSeuG9ZVKaKq2HEP1jJ1gn1zT3pjzjTRmliRg2sI+4YzR35oDomW6BKn/0nWa
UA3AUhp0/37A9P613ugeA5mu4NM0/3eVhVf+/R+5S+XCKxsMJs4xd+YAdF2Yd+MK
KLlZv14ZaoQddFITbRz3JKbdBJxTwjWnZGL/4SdCpksDcJai6O9n4iY02/0yhRMo
OtBe563A12zlAlrkMODWGe0HR5d89gTHdUnWLkMwmS2IUjTVkXK2yWx6arff2Dg4
IjublErikvZt6evN19RpkivK0GiJnNAc1HzOAdqDZ1Q0kStj68jSsAE9yCvSrWjV
+dciZ1tPAgMBAAECggEAIsKAXojO+DSeLbLkM4G+wzNdQmqmM11TXpB7RqodpMDb
h5F1twwFzq/1tWm1Ctx/0/8x+vG1PVTa+7CNUL6gf8z44JD7MPbM0IIDEQ8iiSsO
UVGYYKCUyoSCwJEqeo87H1YSwLGYMXYr99pEfYDyiWGVx1CPKC6vLwICLONhhbqK
i5QHen85QuGbLKGkdU1jREY43HkDpbO+7soKScVdGLunTTkkogvpafN2mTLCzCs6
OqNtjmVzaEGF3eJeJnc3ef+no8bx/CY5v5Grif1yR8XZ5QhUmv9590rjtBI7bHPH
JT3SdK3z8/uJ9axP1Y99lC/q16MqyHYXqD+N49b5EQKBgQD1g/2S2Qz3G+sfxTnj
YllUuE922hW/Q/VqWbzW81hmX+NFBUBkr98ERNbrU+mS0U1WmppCp+OTYuttTbNi
+kl+KdMmRFfFDp9+55HSRgKOpQGcp/TUNj9e51p3Ms9aS4FmSk/OcqzZXmu5Sfvs
AJA+1ivQjvXVj6vLVXy/3w3b0QKBgQDZ/z7pBx9IPhB04YY7HEX9jQFIO46Zpzr/
ahLEXr5ocekv2nP/pQubK3eFBPWJzcS3M0QRQJoEQOO6BFGvvhef4RS7TDQu4vZ6
yPWtlP83neFheXA3PEdASYxgNNPYMW5UvE4UQp0zMHPG5qEpvq5PjylLDN6xadl8
3i0CsjYtHwKBgQDX5tp26KieJc7+gVIGw9YKyooW2nGFYR3QCFooLJbwcCJL7/JQ
mNhlyKO3DnO4yJZaMlq1gy59zd96n3nA8JjweZdVb4Q/pjxcPQffAfH9vt1MBecn
Nw1DR/AmImh13zBL482Knw2hmYbhyk3fnB89Itok7ZMB2vYYOXUaxexKAQKBgFJo
2phvN9UwmToGM59O7eqPDogG876EaJo7uEKB6otDXLrZY3amJwAO64zetg/VOONk
vvuip1aqTSx6C4NbYkTvas3vXd7HsBP0umNXay/UQGp/5PsMj4bvBuErt1YIQcRI
t1+TWygJzgrIDu7gBbdP0HVttRXuhOheeTeGtVJTAoGBALpf8zZ9vldue0BFr099
tBqbL3nZfI9YtQNVnES9tyxkDKr3JEL0N9hVT2mZBIVYnbDWcRuTg2ftLAnDXXz2
/X+heA6FDUacSIZAil3qv+2PkHvz8NVK/dDQPrXL+pBT5HY8VMTikPp+UdpO/kyn
NlvxmkjuRsvHPkCZHHv9cxfq
-----END PRIVATE KEY-----`,
  "client_email": "firebase-adminsdk-fbsvc@zerokoin-4e239.iam.gserviceaccount.com",
  "client_id": "108196235902460709232",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40zerokoin-4e239.iam.gserviceaccount.com"
};

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

module.exports = { admin }; 