/**
 * Elizabeth Petro Babysitting Booking - Configuration & Shared Helpers
 */
const BOOKING_CONFIG = {
    // Sheety API endpoint for the 'booking' tab
    API_URL: 'https://api.sheety.co/cdc4bd0f863be78dfb7d6f3223bcd46c/elizabethVolleyballV2/booking',

    // Elizabeth's notifications
    ELIZABETH_NAME: 'Elizabeth Petro',
    ELIZABETH_EMAIL: 'elizabethpetroapple@gmail.com',

    // Spectrum Mobile uses the Verizon SMS gateway (@vtext.com).
    // Can be entered here or updated in /manage settings
    ELIZABETH_PHONE: '9848107314',
    SPECTRUM_SMS_GATEWAY: '@vtext.com',

    // Access PIN for /manage (can be updated here or in localStorage)
    DEFAULT_PIN: '1234',

    // Google Apps Script Web App URL for free automated emails & Spectrum SMS
    // (Deploy as Web App in Google Sheets: Extensions > Apps Script)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby-APaf-FPr8bp5bP0fDLOjmKiLGvqylh-nVCTxESr0_YD8XVBb0-NIeaDB9JuR8yhtJg/exec',

    // Web3Forms access key (fallback)
    WEB3FORMS_KEY: 'e5772b53-487b-4ea7-9099-23c2a05d8bc9',

    SITE_URL: 'https://lizzysits.com'
};

// PIN management helper
function getStoredPin() {
    return localStorage.getItem('elizabeth_manage_pin') || BOOKING_CONFIG.DEFAULT_PIN;
}

function verifyPin(pin) {
    return String(pin).trim() === String(getStoredPin()).trim();
}

function setStoredPin(newPin) {
    localStorage.setItem('elizabeth_manage_pin', String(newPin).trim());
}

function isManagerAuthenticated() {
    const authExpires = localStorage.getItem('elizabeth_auth_expires');
    if (!authExpires) return false;
    return Date.now() < parseInt(authExpires, 10);
}

function setManagerSession(rememberDays = 30) {
    const expires = Date.now() + (rememberDays * 24 * 60 * 60 * 1000);
    localStorage.setItem('elizabeth_auth_expires', expires.toString());
}

function clearManagerSession() {
    localStorage.removeItem('elizabeth_auth_expires');
}

/**
 * Send notification to Elizabeth via Google Apps Script (or Web3Forms fallback)
 */
async function notifyElizabethOfBooking(booking) {
    const baseUrl = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? window.location.origin
        : "https://lizzysits.com";
    const manageUrl = `${baseUrl}/manage?request=${booking.id || ""}`;
    const appScriptUrl = BOOKING_CONFIG.APPS_SCRIPT_URL || localStorage.getItem('elizabeth_appscript_url');

    // 1. Google Apps Script Web App (Instant Email + Spectrum SMS text)
    if (appScriptUrl) {
        try {
            await fetch(appScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'new_booking',
                    booking: {
                        ...booking,
                        manageUrl: manageUrl
                    }
                })
            });
            console.log('Successfully posted booking alert to Google Apps Script');
            return true;
        } catch (err) {
            console.error('Failed to notify via Google Apps Script:', err);
        }
    }

    // 2. Fallback: Web3Forms
    const smsAddress = BOOKING_CONFIG.ELIZABETH_PHONE
        ? `${BOOKING_CONFIG.ELIZABETH_PHONE.replace(/\D/g, '')}${BOOKING_CONFIG.SPECTRUM_SMS_GATEWAY}`
        : null;

    const timeDisplay = booking.requestedEndTime
        ? `${booking.startTime} until ~${booking.requestedEndTime} (Slot was: ${booking.startTime} - ${booking.endTime})`
        : `${booking.startTime} - ${booking.endTime}`;

    const emailSubject = `👶 New Babysitting Request: ${booking.parentName} (${booking.date} @ ${booking.startTime})`;
    const textSummary = `New Babysitting Request!\nFamily: ${booking.parentName}\nDate: ${booking.date}\nHours: ${timeDisplay}\nKids: ${booking.childrenInfo || 'N/A'}\nPhone: ${booking.parentPhone}\nReview: ${manageUrl}`;

    if (BOOKING_CONFIG.WEB3FORMS_KEY) {
        try {
            await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: BOOKING_CONFIG.WEB3FORMS_KEY,
                    subject: emailSubject,
                    from_name: 'Babysitting Booking Bot',
                    to_email: BOOKING_CONFIG.ELIZABETH_EMAIL,
                    message: `${textSummary}\n\nNotes: ${booking.notes || 'None'}\nLocation: ${booking.location || 'N/A'}\n\nReview & Respond here: ${manageUrl}`
                })
            });
            return true;
        } catch (err) {
            console.error('Failed to dispatch fallback notification:', err);
            return false;
        }
    }
    return false;
}

/**
 * Send decision notification back to the parent (Accept/Reject)
 */
async function notifyParentOfDecision(booking, isAccepted, customMessage) {
    if (!booking.parentEmail && !booking.parentPhone) return;

    const appScriptUrl = BOOKING_CONFIG.APPS_SCRIPT_URL || localStorage.getItem('elizabeth_appscript_url');

    // 1. Google Apps Script Web App (Sends confirmation email directly from Elizabeth's Gmail)
    if (appScriptUrl && booking.parentEmail) {
        try {
            await fetch(appScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'decision',
                    booking: booking,
                    isAccepted: isAccepted,
                    customMessage: customMessage
                })
            });
            console.log('Successfully posted parent decision alert to Google Apps Script');
            return;
        } catch (err) {
            console.error('Failed to notify parent via Google Apps Script:', err);
        }
    }

    // 2. Fallback: Web3Forms
    const statusWord = isAccepted ? 'ACCEPTED! 🎉' : 'Declined';
    const subject = `Babysitting Request ${statusWord} - Elizabeth Petro`;
    const message = `Hi ${booking.parentName},\n\nElizabeth has ${isAccepted ? 'confirmed' : 'declined'} your babysitting request for ${booking.date} (${booking.startTime} - ${booking.endTime}).\n\n` +
        (customMessage ? `Message from Elizabeth:\n"${customMessage}"\n\n` : '') +
        (isAccepted ? `She looks forward to babysitting! If you need to reach her, you can reply directly or contact her at ${BOOKING_CONFIG.ELIZABETH_EMAIL}.\n` : 'Thank you for understanding!\n') +
        `\nBest,\nElizabeth Petro`;

    if (BOOKING_CONFIG.WEB3FORMS_KEY && booking.parentEmail) {
        try {
            await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: BOOKING_CONFIG.WEB3FORMS_KEY,
                    subject: subject,
                    from_name: 'Elizabeth Petro',
                    to_email: booking.parentEmail,
                    reply_to: BOOKING_CONFIG.ELIZABETH_EMAIL,
                    message: message
                })
            });
        } catch (e) {
            console.error('Failed to notify parent via fallback email:', e);
        }
    }
}
