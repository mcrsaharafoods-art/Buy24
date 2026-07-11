import { APP_NAME } from "./constants";

/**
 * Service to send emails.
 * Currently configured for DEVELOPMENT ONLY.
 * It mocks sending an email by printing to the server console.
 * In the future, this can be replaced with Resend, SendGrid, etc.
 */
export async function sendApprovalEmail(
  vendorEmail: string,
  vendorName: string,
  loginUrl: string,
): Promise<boolean> {
  const subject = `Your ${APP_NAME} Vendor Application is Approved!`;
  const body = `
=========================================
EMAIL MOCK (DEVELOPMENT)
=========================================
To: ${vendorEmail}
Subject: ${subject}

Dear ${vendorName},

Congratulations!

Your ${APP_NAME} Vendor Application has been approved.

You can now login using your registered account and start uploading your products.

Login URL: ${loginUrl}
Registered Email: ${vendorEmail}

Welcome to the team!
=========================================
  `;

  if (process.env.NODE_ENV === "development") {
    console.log(body);
    return true;
  }

  // TODO: Implement actual email provider for production
  console.log("[EMAIL SERVICE - PROD] Logging instead of sending since no provider is configured.");
  console.log(body);

  return true;
}
