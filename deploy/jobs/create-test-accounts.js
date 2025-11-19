const fs = require(`fs`)
const path = require(`path`)

const configPath = path.join(__dirname, `test-accounts-config.json`)
const config = JSON.parse(fs.readFileSync(configPath, `utf8`))

const BASE_AUTH_URL = process.env.AUTH_API_URL
const BASE_ACCOUNTS_URL = process.env.ACCOUNTS_API_URL
const BASE_CHANGE_PASSWORD_URL = process.env.CHANGE_PASSWORD_URL
const BASE_RESET_PASSWORD_URL = process.env.RESET_PASSWORD_URL

async function main() {
  try {
    const token = await loginAndGetToken()
    const tenantIdsMap = await createTestTenants(token)
    const rolesIdsMap = await createTestRoles(token)

    await createTestAccounts(token, tenantIdsMap, rolesIdsMap)
  }
  catch (err) {
    console.error(`Error creating test accounts:`)
    console.error(err.message)
    process.exit(1)
  }
}

async function loginAndGetToken() {
  console.log(`Logging in to auth service at ${BASE_AUTH_URL}...`)
  const data = await fetchJson(BASE_AUTH_URL, {
    method: `POST`,
    body: JSON.stringify(config.loginCredentials),
  })

  const token = data?.accessToken?.value
  if (!token) throw new Error(`Token not found in auth response`)

  console.log(`Got auth token (${token.slice(0, 30)}...)`)
  return `Bearer ${token}`
}

async function createTestAccounts(token, tenantIdsMap, rolesIdsMap) {
  console.log(`Fetching existing accounts from ${BASE_ACCOUNTS_URL}accounts/all...`)
  const accounts = await fetchJson(`${BASE_ACCOUNTS_URL}accounts/all`, {
    headers: {
      Authorization: token, 
    },
  })

  const existingEmails = accounts.map((a) => a.corporateEmail)

  for (const acc of config.testAccounts) {
    const email = acc.corporateEmail

    if (existingEmails.includes(email)) {
      console.log(`Account ${email} already exists`)
      continue
    }
    const existingTenantId = tenantIdsMap[acc.tenantName]

    const existingRoleId = rolesIdsMap[acc.roleName]

    await fetchJson(`${BASE_ACCOUNTS_URL}accounts/create`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify({
        ...acc,
        tenantId: existingTenantId,
        roleIds: [
          existingRoleId,
        ],
      }),
    })
    console.log(`Account ${email} created successfully`)

    await changePassword(email, acc.newPassword)
  }

  console.log(`All test accounts created and passwords updated`)
}

async function changePassword(corporateEmail, newPassword) {
  console.log(`Changing password for ${corporateEmail}...`)
  const passwordResetToken = await getResetToken(corporateEmail)

  try {
    await fetchJson(BASE_CHANGE_PASSWORD_URL, {
      method: `PUT`,
      body: JSON.stringify({
        corporateEmail,
        passwordResetToken,
        newPassword,
      }),
    })
    console.log(`Password changed for ${corporateEmail}`)
  }
  catch (e) {
    console.warn(`Failed to change password for ${corporateEmail}: ${e.message}`)
  }
}

async function getResetToken(corporateEmail) {
  console.log(`Requesting password reset token for ${corporateEmail}...`)
  try {
    const data = await fetchJson(`${BASE_RESET_PASSWORD_URL}?corporateEmail=${encodeURIComponent(corporateEmail)}`, {
      method: `POST`,
    })

    const token = data?.passwordResetToken
    if (!token) throw new Error(`No reset token in response`)

    console.log(`Got reset token for ${corporateEmail}`)
    return token
  }
  catch (err) {
    console.warn(`Failed to get reset token for ${corporateEmail}: ${err.message}`)
    return null
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": `application/json`,
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  try {
    return await res.json()
  }
  catch {
    return {}
  }
}

async function createTestTenants(token) {
  console.log(`Fetching existing tenants from ${BASE_ACCOUNTS_URL}tenants/all...`)
  
  const tenants = await fetchJson(`${BASE_ACCOUNTS_URL}tenants/all`, {
    headers: {
      Authorization: token, 
    },
  })

  const tenantIdsMap = {}
  for (const tenant of tenants) {
    tenantIdsMap[tenant.name] = tenant.id
  }

  for (const tenant of config.testTenants) {
    const tenantName = tenant.name

    if (tenantIdsMap[tenantName]) {
      console.log(`Tenant ${tenantName} already exists with id ${tenantIdsMap[tenantName]}`)
      continue
    }

    console.log(`Creating tenant ${tenantName}...`)
    await fetchJson(`${BASE_ACCOUNTS_URL}tenants`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify(tenant),
    })
  }

  const newTenants = await fetchJson(`${BASE_ACCOUNTS_URL}tenants/all`, {
    headers: { Authorization: token },
  })

  for (const tenant of newTenants) {
    tenantIdsMap[tenant.name] = tenant.id
  }

  console.log(`All test tenants created:\n`, tenantIdsMap)
  return tenantIdsMap
}

async function createTestRoles(token) {
  const roles = await fetchJson(`${BASE_ACCOUNTS_URL}roles`, {
    headers: {
      Authorization: token, 
    },
  })

  const rolesIdsMap = {}

  for (const role of roles) {
    rolesIdsMap[role.name] = role.id
  }

  for (const role of config.testRoles) {
    const roleName = role.name

    if (rolesIdsMap[roleName]) {
      continue
    }

    const createdId = await fetchJson(`${BASE_ACCOUNTS_URL}roles/create`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify(role),
    })

    rolesIdsMap[roleName] = createdId
  }

  return rolesIdsMap
}

main()