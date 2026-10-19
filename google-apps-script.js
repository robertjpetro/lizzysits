/**
 * ============================================================================
 * Elizabeth Petro Babysitting Booking - Google Apps Script Backend
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS (Takes ~2 minutes):
 * 1. Open Elizabeth's Google Sheet under your account (robertjpetro@gmail.com).
 * 2. In the top menu, click: Extensions > Apps Script.
 * 3. Delete any existing code in Code.gs and paste this entire file.
 * 4. Fill in ELIZABETH_PHONE below with Elizabeth's 10-digit phone number.
 * 5. Click the floppy disk icon (💾 Save).
 * 6. In the top right, click "Deploy" > "New deployment":
 *    - Click the gear icon next to "Select type" and choose "Web app".
 *    - Description: "Babysitting Alerts"
 *    - Execute as: "Me (robertjpetro@gmail.com)"   <--- Runs under your Google account
 *    - Who has access: "Anyone"                   <--- Crucial: allows website to dispatch
 *    - Click "Deploy".
 *    - Click "Authorize access", choose your Google account (robertjpetro@gmail.com),
 *      click "Advanced", and click "Go to Untitled project (unsafe)" to grant permissions.
 * 7. Copy the "Web app URL" (looks like https://script.google.com/macros/s/AKfycb.../exec).
 * 8. Paste that URL into config.js as the value for APPS_SCRIPT_URL.
 * 9. (Optional Test): Select "testSendAlert" from the function dropdown and click "Run".
 *    Elizabeth will immediately get an email and an SMS text (and you'll get a CC email)!
 * ============================================================================
 */

const CONFIG = {
  // Display name shown to parents in their email inbox
  SENDER_NAME: 'Lizzy Sits Babysitting',

  // Elizabeth's email address
  ELIZABETH_EMAIL: 'elizabethpetroapple@gmail.com',

  // Dad's email address
  DAD_EMAIL: 'robertjpetro@gmail.com',

  // Set to true if you (Dad) also want an email copy whenever a new booking is requested
  CC_DAD_ON_NEW_BOOKINGS: true,

  // Put Elizabeth's 10-digit cell phone number here (digits only, e.g. '9195551234')
  ELIZABETH_PHONE: '9848107314',

  // Spectrum Mobile gateway (Spectrum uses Verizon's SMS gateway)
  SMS_GATEWAY: '@vtext.com',

  // Link to Elizabeth's management portal (Live site fallback)
  MANAGE_URL: 'https://lizzysits.com/manage'
};

/**
 * Web App HTTP GET Endpoint (Confirms Web App is Active)
 */
function doGet(e) {
  return ContentService.createTextOutput("Elizabeth Petro Babysitting Booking Webhook is Active!")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Web App HTTP POST Endpoint (Called automatically by the website)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'new_booking') {
      sendNewBookingNotifications(payload.booking);
    } else if (action === 'decision') {
      sendDecisionNotification(payload.booking, payload.isAccepted, payload.customMessage);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 1. Notify Elizabeth of a new booking request (Email + Spectrum SMS)
 */
function sendNewBookingNotifications(booking) {
  if (!booking) return;

  const parentName = booking.parentName || 'A Family';
  const date = booking.date || '';
  const time = booking.requestedEndTime
    ? `${booking.startTime} until ~${booking.requestedEndTime} (Slot: ${booking.startTime} - ${booking.endTime})`
    : `${booking.startTime} - ${booking.endTime}`;
  const children = booking.childrenInfo || 'N/A';
  const phone = booking.parentPhone || 'N/A';
  const email = booking.parentEmail || 'N/A';
  const location = booking.location || 'N/A';
  const notes = booking.notes || 'None';
  // Use dynamically passed manageUrl from website, or fall back to live URL
  const manageUrl = booking.manageUrl || `${CONFIG.MANAGE_URL}?request=${booking.id || ''}`;

  // --- Send Email Alert to Elizabeth (and Dad) ---
  const emailSubject = `👶 New Babysitting Request: ${parentName} (${date} @ ${booking.startTime})`;
  const emailBody =
    `Hi Elizabeth!

You received a new babysitting request:

• Family: ${parentName}
• Date: ${date}
• Hours: ${time}
• Kids: ${children}
• Location: ${location}
• Phone: ${phone}
• Email: ${email}
• Notes: ${notes}

👉 Open your dashboard to Accept or Decline:
${manageUrl}
`;

  const emailRecipients = [CONFIG.ELIZABETH_EMAIL];
  if (CONFIG.DAD_EMAIL && CONFIG.CC_DAD_ON_NEW_BOOKINGS && CONFIG.DAD_EMAIL !== CONFIG.ELIZABETH_EMAIL) {
    emailRecipients.push(CONFIG.DAD_EMAIL);
  }

  MailApp.sendEmail({
    to: emailRecipients.join(','),
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.ELIZABETH_EMAIL,
    subject: emailSubject,
    body: emailBody
  });
  Logger.log('Sent new booking email alert to: ' + emailRecipients.join(', '));

  // --- Send SMS Text to Elizabeth's Phone (Spectrum @vtext.com) ---
  const cleanPhone = (CONFIG.ELIZABETH_PHONE || '').replace(/\D/g, '');
  if (cleanPhone && cleanPhone.length === 10) {
    const smsAddress = `${cleanPhone}${CONFIG.SMS_GATEWAY}`;
    const smsText =
      `Babysitting Request!
Family: ${parentName}
Date: ${date} (${booking.startTime})
Kids: ${children}
Phone: ${phone}
Review: ${manageUrl}`;

    MailApp.sendEmail({
      to: smsAddress,
      subject: 'New Babysitting Request',
      body: smsText
    });
    Logger.log('Sent SMS text via gateway to: ' + smsAddress);
  } else {
    Logger.log('SMS skipped: CONFIG.ELIZABETH_PHONE is not configured with a 10-digit number.');
  }
}

/**
 * 2. Notify Parent when Elizabeth Accepts or Declines (Email from Elizabeth's Services)
 */
function sendDecisionNotification(booking, isAccepted, customMessage) {
  if (!booking || !booking.parentEmail) {
    Logger.log('Parent notification skipped: no parent email provided.');
    return;
  }

  const statusWord = isAccepted ? 'ACCEPTED! 🎉' : 'Update';
  const subject = `Babysitting Request ${statusWord} - Elizabeth Petro`;

  let body = `Hi ${booking.parentName || 'there'},\n\n`;

  if (isAccepted) {
    body += `Elizabeth has confirmed your babysitting request for ${booking.date} (${booking.startTime} - ${booking.endTime})!\n\n`;
  } else {
    body += `Thank you for reaching out! Unfortunately, Elizabeth is unavailable to babysit on ${booking.date} (${booking.startTime} - ${booking.endTime}).\n\n`;
  }

  if (customMessage && customMessage.trim()) {
    body += `Message from Elizabeth:\n"${customMessage.trim()}"\n\n`;
  }

  if (isAccepted) {
    body += `She looks forward to babysitting! If you have any questions or details to coordinate, you can reply directly to this email or reach Elizabeth at ${CONFIG.ELIZABETH_EMAIL}.\n\n`;
  }

  body += `Best,\nElizabeth (Lizzy) Petro\nLizzy Sits Babysitting`;

  // Parents see "Elizabeth Petro Babysitting" as the sender.
  // Replies go directly to Elizabeth (and Dad can be kept on reply-to as well).
  const replyToAddresses = [CONFIG.ELIZABETH_EMAIL];
  if (CONFIG.DAD_EMAIL && CONFIG.DAD_EMAIL !== CONFIG.ELIZABETH_EMAIL) {
    replyToAddresses.push(CONFIG.DAD_EMAIL);
  }

  MailApp.sendEmail({
    to: booking.parentEmail,
    name: CONFIG.SENDER_NAME,
    replyTo: replyToAddresses.join(','),
    subject: subject,
    body: body
  });
  Logger.log('Sent decision email to parent: ' + booking.parentEmail);
}

/**
 * Quick Test Function: Run this directly in the Apps Script editor to test!
 */
function testSendAlert() {
  sendNewBookingNotifications({
    id: 1,
    parentName: 'Test Family (Petro)',
    date: '2026-10-30',
    startTime: '5:00 PM',
    endTime: '9:00 PM',
    childrenInfo: '2 kids (ages 4 and 7)',
    parentPhone: '919-555-0199',
    parentEmail: 'parent@example.com',
    location: 'Rolesville',
    notes: 'Bedtime is at 8:00 PM. Snacks in the kitchen pantry.'
  });
  Logger.log('Test run finished! Check Elizabeth’s email, your email, and Elizabeth’s phone.');
}
