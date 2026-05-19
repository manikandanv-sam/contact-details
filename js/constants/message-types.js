export const MESSAGE_TYPES = Object.freeze({
  // iframe → CMP
  IFRAME_READY:     "IFRAME_READY",
  IFRAME_DOWN:      "IFRAME_DOWN",
  OTP_SENT:         "OTP_SENT",
  CONTACT_UPDATED:  "CONTACT_UPDATED",
  ERROR:            "ERROR",

  // CMP → iframe
  INIT:             "INIT",
});
