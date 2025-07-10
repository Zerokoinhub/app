const User = require('../models/User');

/**
 * Get server time for time synchronization
 * This endpoint provides authoritative server time to detect client-side time manipulation
 */
exports.getServerTime = async (req, res) => {
  try {
    const serverTime = new Date();
    
    // Get user info for logging
    const { uid } = req.user;
    
    // Log the time request for security monitoring
    console.log(`🕐 Server time requested by user ${uid} at ${serverTime.toISOString()}`);
    
    res.status(200).json({
      serverTime: serverTime.toISOString(),
      timestamp: serverTime.getTime(),
      timezone: 'UTC'
    });
  } catch (error) {
    console.error('Get server time error:', error.message);
    res.status(500).json({ 
      message: 'Error getting server time', 
      error: error.message 
    });
  }
};

/**
 * Validate session timing against server time
 * This endpoint validates that session completion times are legitimate
 */
exports.validateSessionTiming = async (req, res) => {
  try {
    const { uid } = req.user;
    const { sessionNumber, clientTime, lastKnownServerTime } = req.body;
    
    if (!sessionNumber || !clientTime) {
      return res.status(400).json({ 
        message: 'sessionNumber and clientTime are required' 
      });
    }
    
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const serverTime = new Date();
    const clientTimeDate = new Date(clientTime);
    const timeDifference = Math.abs(serverTime.getTime() - clientTimeDate.getTime()) / 1000; // in seconds
    
    // Allow up to 5 minutes difference between client and server time
    const maxAllowedDifference = 300; // 5 minutes
    
    const isTimeValid = timeDifference <= maxAllowedDifference;
    
    // Find the session to validate
    const session = user.sessions.find(s => s.sessionNumber === sessionNumber);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Additional validation: check if session should be unlocked based on server time
    let isSessionValid = true;
    let validationMessage = 'Session timing is valid';
    
    if (session.isLocked && session.nextUnlockAt) {
      const shouldBeUnlocked = serverTime >= session.nextUnlockAt;
      if (!shouldBeUnlocked) {
        isSessionValid = false;
        validationMessage = 'Session is still locked according to server time';
      }
    }
    
    // Log validation attempt for security monitoring
    console.log(`🔍 Session timing validation for user ${uid}:`);
    console.log(`  - Session: ${sessionNumber}`);
    console.log(`  - Client time: ${clientTimeDate.toISOString()}`);
    console.log(`  - Server time: ${serverTime.toISOString()}`);
    console.log(`  - Time difference: ${timeDifference}s`);
    console.log(`  - Time valid: ${isTimeValid}`);
    console.log(`  - Session valid: ${isSessionValid}`);
    
    // If time manipulation is suspected, log it as a security event
    if (!isTimeValid || !isSessionValid) {
      console.warn(`🚨 Potential time manipulation detected for user ${uid}:`);
      console.warn(`  - Time difference: ${timeDifference}s`);
      console.warn(`  - Session state: ${JSON.stringify(session)}`);
    }
    
    res.status(200).json({
      isTimeValid,
      isSessionValid,
      timeDifference,
      serverTime: serverTime.toISOString(),
      validationMessage,
      session: {
        sessionNumber: session.sessionNumber,
        isLocked: session.isLocked,
        nextUnlockAt: session.nextUnlockAt,
        unlockedAt: session.unlockedAt,
        completedAt: session.completedAt
      }
    });
  } catch (error) {
    console.error('Validate session timing error:', error.message);
    res.status(500).json({ 
      message: 'Error validating session timing', 
      error: error.message 
    });
  }
};

/**
 * Get time validation status for a user
 * This endpoint provides information about the user's time validation state
 */
exports.getTimeValidationStatus = async (req, res) => {
  try {
    const { uid } = req.user;
    
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const serverTime = new Date();
    
    // Check all sessions for timing consistency
    const sessionTimingStatus = user.sessions.map(session => {
      let status = 'valid';
      let message = 'Session timing is consistent';
      
      if (session.isLocked && session.nextUnlockAt) {
        const shouldBeUnlocked = serverTime >= session.nextUnlockAt;
        if (shouldBeUnlocked) {
          status = 'should_unlock';
          message = 'Session should be unlocked based on server time';
        }
      }
      
      return {
        sessionNumber: session.sessionNumber,
        status,
        message,
        isLocked: session.isLocked,
        nextUnlockAt: session.nextUnlockAt,
        timeDifference: session.nextUnlockAt ? 
          (session.nextUnlockAt.getTime() - serverTime.getTime()) / 1000 : null
      };
    });
    
    res.status(200).json({
      serverTime: serverTime.toISOString(),
      userSessions: sessionTimingStatus,
      timeValidationEnabled: true
    });
  } catch (error) {
    console.error('Get time validation status error:', error.message);
    res.status(500).json({ 
      message: 'Error getting time validation status', 
      error: error.message 
    });
  }
};

/**
 * Force session unlock based on server time validation
 * This endpoint allows forcing session unlocks when client-side timing is compromised
 */
exports.forceSessionUnlock = async (req, res) => {
  try {
    const { uid } = req.user;
    const { sessionNumber } = req.body;
    
    if (!sessionNumber) {
      return res.status(400).json({ message: 'sessionNumber is required' });
    }
    
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const session = user.sessions.find(s => s.sessionNumber === sessionNumber);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const serverTime = new Date();
    
    // Check if session should be unlocked based on server time
    if (session.isLocked && session.nextUnlockAt && serverTime >= session.nextUnlockAt) {
      session.isLocked = false;
      session.unlockedAt = serverTime;
      session.nextUnlockAt = null;
      
      await user.save();
      
      console.log(`🔓 Force unlocked session ${sessionNumber} for user ${uid} based on server time validation`);
      
      res.status(200).json({
        message: 'Session unlocked based on server time validation',
        session: {
          sessionNumber: session.sessionNumber,
          isLocked: session.isLocked,
          unlockedAt: session.unlockedAt,
          nextUnlockAt: session.nextUnlockAt
        },
        serverTime: serverTime.toISOString()
      });
    } else {
      res.status(400).json({
        message: 'Session cannot be unlocked yet according to server time',
        session: {
          sessionNumber: session.sessionNumber,
          isLocked: session.isLocked,
          nextUnlockAt: session.nextUnlockAt
        },
        serverTime: serverTime.toISOString(),
        timeRemaining: session.nextUnlockAt ? 
          Math.max(0, (session.nextUnlockAt.getTime() - serverTime.getTime()) / 1000) : 0
      });
    }
  } catch (error) {
    console.error('Force session unlock error:', error.message);
    res.status(500).json({ 
      message: 'Error forcing session unlock', 
      error: error.message 
    });
  }
};
