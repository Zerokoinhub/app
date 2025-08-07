const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "zerokoin-705c5",
  "private_key_id": "c31432c2318b18ad04f287f2b625c81a4e0d0827",
  "private_key": `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCvHmTumKriwT88
G2fb3pu0uh+COoIhUXzlz2lVXmmKF5bI0/rDFfmIa8XXm34XZg4dimKMXTsXqY5L
Bezjk1iY42TFGv3k5SjS0aUbIwO2XbxlaZYfh4WM2r+qajfkz5JTu+RFrQ/Xt1gm
gB2xqt+Um5OG+TUsT/SHuAhtQxIBPFCwafsUMVMXz53csMd1SDeVlGnactBVQdfm
7cBLjbfMa0TAWK4+oqwb2x6TFBlP0OHFgQxYU55/C+W9zIMp0AnoVydGrUQ3oqWz
pDLl/Jn/PANjYgyR1oa1vd+MI8V118NKwssPmWwdBbYBCQm/a9lJL2QgWGTE6G/t
mDYnihhxAgMBAAECggEABqcQQSjtNX7vRbuaDAYSeti3A5fQy56ckL+q1gyXlHCZ
2KRmbmi4XYKQHhUs8qs8qipAnQnZ6cfGBUM67QiTBSBe2rbQOkTLIqqmk7/GV2RL
WNwscQNRS1EAVuNQ/yUUT1BoDy5QV7LiMzi64A3wb1Ujcy1GlAnPzaPb9JgnoAK0
KYfCz9CXMuRMLqpTplfCrh/VdVpxMDmWUMMY2yDRUJTuEm/9kUUnLAIBAm6sM021
PP9ZkLxkW8GmO1UjiHuT8DFlYRts3uLKWUf1RHhWztY3cPo0m7TnAKWg1MU+fZ5X
qO129f7SAZ/Xp0Vju8UtxjLtqnu4OvWyjSkXVaauoQKBgQDciC8mgDSgwOWF+cee
6tkMuoQQPoUByMs7R25f0/ewNXc63xy6yTuYVbuWGrThqVyDe0US0wsDuDYID1B3
v3DtQmMpIB1KM8vnjlr5H7ZotEJoTWY9mvZQU2N//CbuRu17MthNda99AYB0hxMN
NNS8T2LdjwPLW94QWhVXjlSZkQKBgQDLSHDhdjxoW/3iwXxOTgV8zjjmM66Q0VcM
DGqm7Go9JUtpE5RXOP8aLxNg93Gg5/GVpWXp/4vAfdENv09CWylS33zGClt2IwDy
fReOfwM0xvjU7H3pJ616tlI6CsPKkb1qTLdaf0+vTEZUuZkixONDQ79Jv/dwGf7W
LDqd5a0g4QKBgQCXKnZ/gqQQiQkL1BKkeUC8u+EorWJIvdWpVaZv44FF9PA8l5E+
7A+AtUu3cakJgikbK1VGuQk0zIGk9rJm0wBacgY8u3m4Ulbz652qZLWJgf5/Nobd
taofl3l90l7xOAczSsAAIKphGrVtquVBSTSFvDj9vDmSnO9T8Bvu/244MQKBgQDF
cs9xrw5tryyjG5xJ0q6x0vyhXIGqWCtcoJLXH7rxOVBN956WOd5O6HrCLJZJ3ABj
ggvDhVuQ1KRB3hh2M2WoATuIgHbmAIni/m3rEqNimAEJj8ucs9Vk48JqbhpOn9CD
d5CAbjhP5J5LnRqJEwRLSXp7f+IvGJDWJo+o3nWTAQKBgQCq44S2N7p7TRxJjmSG
GD9k0Q1fVed5avIWcFGLCmPFAB3xWKWiMM6DtnNviXsF96g9g0Ek6nCynCk/Cc5e
MBwwk6pDDrG5To8jieTCjUeBevhOQE0SEZpKpuOHJW4wXr+5b/SUjiPaCguSPMcu
+Z8zFeUbnXnP8vwkrqTmo8iWjg==
-----END PRIVATE KEY-----`,
  "client_email": "firebase-adminsdk-fbsvc@zerokoin-705c5.iam.gserviceaccount.com",
  "client_id": "108588023842407313656",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40zerokoin-705c5.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
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