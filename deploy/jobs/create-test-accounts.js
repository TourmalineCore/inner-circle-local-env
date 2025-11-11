const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'test-accounts-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const BASE_AUTH_URL = process.env.AUTH_API_URL;
const BASE_ACCOUNTS_URL = process.env.ACCOUNTS_API_URL;
const BASE_CHANGE_PASSWORD_URL = process.env.CHANGE_PASSWORD_URL;
const BASE_RESET_PASSWORD_URL = process.env.RESET_PASSWORD_URL;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function loginAndGetToken() {
  console.log(`🟡 Logging in to auth service at ${BASE_AUTH_URL}...`);
  const data = await fetchJson(BASE_AUTH_URL, {
    method: "POST",
    body: JSON.stringify(config.loginCredentials),
  });

  const token = data?.accessToken?.value;
  if (!token) throw new Error("Token not found in auth response");

  console.log(`✅ Got auth token (${token.slice(0, 30)}...)`);
  return `Bearer ${token}`;
}

async function getResetToken(corporateEmail) {
  console.log(`🟡 Requesting password reset token for ${corporateEmail}...`);
  try {
    const data = await fetchJson(`${BASE_RESET_PASSWORD_URL}?corporateEmail=${encodeURIComponent(corporateEmail)}`, {
      method: "POST",
    });

    const token = data?.passwordResetToken;
    if (!token) throw new Error("No reset token in response");

    console.log(`✅ Got reset token for ${corporateEmail}`);
    return token;
  } catch (err) {
    console.warn(`⚠️ Failed to get reset token for ${corporateEmail}: ${err.message}`);
    return null;
  }
}

async function changePassword(corporateEmail, newPassword) {
  console.log(`🟡 Changing password for ${corporateEmail}...`);
  const resetToken = await getResetToken(corporateEmail);
  if (!resetToken) {
    console.warn(`⚠️ Skipping password change for ${corporateEmail} (no reset token)`);
    return;
  }

  try {
    await fetchJson(BASE_CHANGE_PASSWORD_URL, {
      method: "PUT",
      body: JSON.stringify({
        corporateEmail,
        passwordResetToken: resetToken,
        newPassword,
      }),
    });
    console.log(`✅ Password changed for ${corporateEmail}`);
  } catch (e) {
    console.warn(`⚠️ Failed to change password for ${corporateEmail}: ${e.message}`);
  }
}

async function ensureTestAccounts(token) {
  console.log(`🟡 Fetching existing accounts from ${BASE_ACCOUNTS_URL}/all...`);
  const accounts = await fetchJson(`${BASE_ACCOUNTS_URL}/all`, {
    headers: { Authorization: token },
  });

  const existingEmails = accounts.map((a) => a.corporateEmail);

  for (const acc of config.testAccounts) {
    const email = acc.corporateEmail;
    if (existingEmails.includes(email)) {
      console.log(`✅ Account ${email} already exists`);
      await changePassword(email, acc.newPassword);
      continue;
    }

    console.log(`🟡 Creating account ${email}...`);
    await fetchJson(`${BASE_ACCOUNTS_URL}/create`, {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify(acc),
    });
    console.log(`✅ Account ${email} created successfully`);

    await changePassword(email, acc.newPassword);
  }

  console.log("✨ All test accounts ensured and passwords updated");
}

async function main() {
  try {
    const token = await loginAndGetToken();
    await ensureTestAccounts(token);
  } catch (err) {
    console.error("❌ Error ensuring test accounts:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
