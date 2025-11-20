const fs = require(`fs`)
const path = require(`path`)

const configPath = path.join(__dirname, `test-accounts-config.json`)
const config = JSON.parse(fs.readFileSync(configPath, `utf8`))

const BASE_AUTH_URL = process.env.AUTH_API_URL
const BASE_ACCOUNTS_URL = process.env.ACCOUNTS_API_URL

async function main() {
  try {
    const token = await loginAndGetToken()
    console.log(`Token received successfully`)

    const tenantsIdsMap = await createTestTenants(token)
    console.log(`Tenants created`)

    const rolesIdsMap = await createTestRoles(token)
    console.log(`Roles created`)

    await createTestAccounts(token, tenantsIdsMap, rolesIdsMap)
    console.log(`All test accounts created!`)
  }
  catch (err) {
    console.error(`Error creating test accounts:`)
    console.error(err.message)
    process.exit(1)
  }
}

async function loginAndGetToken() {
  console.log(`Getting token...`)

  const data = await fetchJson(`${BASE_AUTH_URL}/login`, {
    method: `POST`,
    body: JSON.stringify(config.loginCredentials),
  })

  const token = data?.accessToken?.value
  if (!token) throw new Error(`Token not found in auth response`)

  return `Bearer ${token}`
}

async function createTestTenants(token) {
  console.log(`Start creating tenants...`)

  const tenants = await fetchJson(`${BASE_ACCOUNTS_URL}/tenants/all`, {
    headers: {
      Authorization: token, 
    },
  })

  const tenantsIdsMap = {}
  for (const tenant of tenants) {
    tenantsIdsMap[tenant.name] = tenant.id
  }

  for (const tenant of config.testTenants) {
    const tenantName = tenant.name

    if (tenantsIdsMap[tenantName]) {
      console.log(`Tenant ${tenantName} already exists`)
      continue
    }

    await fetchJson(`${BASE_ACCOUNTS_URL}/tenants`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify(tenant),
    })

    console.log(`Tenant ${tenantName} created successfully`)
  }

  const newTenants = await fetchJson(`${BASE_ACCOUNTS_URL}/tenants/all`, {
    headers: {
      Authorization: token, 
    },
  })

  for (const tenant of newTenants) {
    tenantsIdsMap[tenant.name] = tenant.id
  }

  return tenantsIdsMap
}

async function createTestRoles(token) {
  console.log(`Start creating roles...`)

  const roles = await fetchJson(`${BASE_ACCOUNTS_URL}/roles`, {
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
      console.log(`Role ${roleName} already exists`)
      continue
    }

    const createdId = await fetchJson(`${BASE_ACCOUNTS_URL}/roles/create`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify(role),
    })

    console.log(`Role ${roleName} created successfully`)

    rolesIdsMap[roleName] = createdId
  }

  return rolesIdsMap
}

async function createTestAccounts(token, tenantsIdsMap, rolesIdsMap) {
  console.log(`Start creating accounts...`)

  const accounts = await fetchJson(`${BASE_ACCOUNTS_URL}/accounts/all`, {
    headers: {
      Authorization: token, 
    },
  })

  const existingEmails = accounts.map((a) => a.corporateEmail)

  for (const account of config.testAccounts) {
    const email = account.corporateEmail

    if (existingEmails.includes(email)) {
      console.log(`Account ${email} already exists`)
      continue
    }
    const existingTenantId = tenantsIdsMap[account.tenantName]

    const existingRoleId = rolesIdsMap[account.roleName]

    await fetchJson(`${BASE_ACCOUNTS_URL}/accounts/create`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify({
        ...account,
        tenantId: existingTenantId,
        roleIds: [
          existingRoleId,
        ],
      }),
    })
    console.log(`Account ${email} created successfully`)

    await setPassword(token, email, account.newPassword)
  }
}

async function setPassword(token, corporateEmail, newPassword) {
  console.log(`Setting password for ${corporateEmail}...`)

  try {
    await fetchJson(`${BASE_AUTH_URL}/set-password`, {
      method: `POST`,
      headers: {
        Authorization: token, 
      },
      body: JSON.stringify({
        corporateEmail,
        newPassword,
      }),
    })
    console.log(`Password set for ${corporateEmail}`)
  }
  catch (e) {
    console.warn(`Failed to set password for ${corporateEmail}: ${e.message}`)
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
    // Avoid crashing and return an empty object if response has no JSON body
    return {}
  }
}

main()