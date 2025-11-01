const BASE_AUTH_URL = process.env.AUTH_API_URL
const BASE_ACCOUNTS_URL = process.env.ACCOUNTS_API_URL
const BASE_CHANGE_PASSWORD_URL = process.env.CHANGE_PASSWORD_URL
const BASE_RESET_PASSWORD_URL = process.env.RESET_PASSWORD_URL

const LOGIN_CREDENTIALS = {
  login: "ceo@tourmalinecore.com",
  password: "cEoPa$$wo1d",
};

const TEST_ACCOUNTS = [
  {
    corporateEmail: "test1@tourmalinecore.com",
    firstName: "Test1",
    lastName: "One",
    middleName: "User",
    roleIds: [2],
    tenantId: "2",
  },
  {
    corporateEmail: "test2@tourmalinecore.com",
    firstName: "Test2",
    lastName: "Two",
    middleName: "User",
    roleIds: [2],
    tenantId: "2",
  },
];

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
    body: JSON.stringify(LOGIN_CREDENTIALS),
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

async function changePassword(corporateEmail) {
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
        newPassword: "Test123!5673Th",
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

  for (const acc of TEST_ACCOUNTS) {
    const email = acc.corporateEmail;
    if (existingEmails.includes(email)) {
      console.log(`✅ Account ${email} already exists`);
      await changePassword(email);
      continue;
    }

    console.log(`🟡 Creating account ${email}...`);
    await fetchJson(`${BASE_ACCOUNTS_URL}/create`, {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify(acc),
    });
    console.log(`✅ Account ${email} created successfully`);

    await changePassword(email);
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
