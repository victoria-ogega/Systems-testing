const tokenKey = Cypress.env("LOCAL_STORAGE_KEY") || "token"
const tokenValue = Cypress.env("ACCESS_TOKEN") || "test-token"

const mockUsers = [
  { user_id: "1", user_type: "patient", email: "alice@example.com", first_name: "Alice", last_name: "Smith", phone_number: "700000001" },
  { user_id: "2", user_type: "patient", email: "bob@example.com", first_name: "Bob", last_name: "Jones", phone_number: "700000002" },
  { user_id: "3", user_type: "admin", email: "admin@example.com", first_name: "Admin", last_name: "", phone_number: "700000003" },
  { user_id: "4", user_type: "patient", email: "charlie@example.com", first_name: "Charlie", last_name: "Brown", phone_number: "700000004" }
]

const mockAppointments = [
  { appointment_id: "1", user_id: "1", service_id: "1", booking_status: "Completed", appointment_date: new Date().toISOString() },
  { appointment_id: "2", user_id: "1", service_id: "2", booking_status: "Upcoming", appointment_date: new Date().toISOString() },
  { appointment_id: "3", user_id: "2", service_id: "3", booking_status: "Cancelled", appointment_date: new Date().toISOString() },
  { appointment_id: "4", user_id: "4", service_id: "1", booking_status: "Completed", appointment_date: new Date().toISOString() }
]

const mockServices = [
  { service_id: "s1", service_name: "HIV Testing", status: "Available", description: "Rapid HIV testing and counseling" },
  { service_id: "s2", service_name: "Family Planning", status: "Available", description: "Contraception services" },
  { service_id: "s3", service_name: "Immunization", status: "Available", description: "Child immunizations" },
  { service_id: "s4", service_name: "Maternal Care", status: "Available", description: "Antenatal and postnatal care" },
  { service_id: "s5", service_name: "Child Health", status: "Available", description: "Pediatric consultations" },
  { service_id: "s6", service_name: "TB Screening", status: "Not Available", description: "TB screening services" },
  { service_id: "s7", service_name: "Counseling", status: "Available", description: "Psychosocial counseling" }
]

function injectAuth(win, token) {
  try { win.localStorage.setItem(tokenKey, token) } catch (e) {}
  const origFetch = win.fetch && win.fetch.bind(win)
  if (origFetch) {
    win.fetch = (resource, init = {}) => {
      init.headers = init.headers || {}
      if (init.headers instanceof win.Headers) {
        const h = {}
        init.headers.forEach((v, k) => h[k] = v)
        init.headers = h
      }
      if (!init.headers["Authorization"] && !init.headers["authorization"]) {
        init.headers["Authorization"] = `Bearer ${token}`
      }
      return origFetch(resource, init)
    }
  }
  const origXHROpen = win.XMLHttpRequest && win.XMLHttpRequest.prototype.open
  const origXHRSend = win.XMLHttpRequest && win.XMLHttpRequest.prototype.send
  if (origXHROpen && origXHRSend) {
    win.XMLHttpRequest.prototype.open = function () {
      this._method = arguments[0]
      this._url = arguments[1]
      return origXHROpen.apply(this, arguments)
    }
    win.XMLHttpRequest.prototype.send = function () {
      try {
        if (typeof this.setRequestHeader === "function") {
          this.setRequestHeader("Authorization", `Bearer ${token}`)
        }
      } catch (e) {}
      return origXHRSend.apply(this, arguments)
    }
  }
}

describe("Sign Up Page", () => {
  beforeEach(() => {
    cy.visit("/signup", {
      onBeforeLoad(win) {
        injectAuth(win, tokenValue)
      }
    })
  })

  it("should display the sign up form", () => {
    cy.contains("Sign Up").should("be.visible")
    cy.get('input[name="first_name"]').should("be.visible")
    cy.get('input[name="last_name"]').should("be.visible")
    cy.get('input[name="phone_number"]').should("be.visible")
    cy.get('input[name="password"]').should("be.visible")
    cy.get('input[name="password_confirmation"]').should("be.visible")
  })

  it("should show password mismatch error", () => {
    cy.get('input[name="password"]').type("password123")
    cy.get('input[name="password_confirmation"]').type("different123")
    cy.contains("Passwords do not match.").should("be.visible")
  })

  it("should allow password visibility toggle", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password")
    cy.get('button[aria-label="Show password"]').click()
    cy.get('input[name="password"]').should("have.attr", "type", "text")
    cy.get('input[name="password_confirmation"]').should("have.attr", "type", "password")
    cy.get('button[aria-label="Show confirm password"]').click()
    cy.get('input[name="password_confirmation"]').should("have.attr", "type", "text")
  })

  it("should submit valid form and redirect to /login", () => {
    cy.intercept("POST", "/api/register", { statusCode: 201, body: { success: true } }).as("registerRequest")
    cy.get('input[name="first_name"]').type("Danait")
    cy.get('input[name="last_name"]').type("Semere")
    cy.get('input[name="phone_number"]').type("1234567890")
    cy.get('input[name="password"]').type("securePass123")
    cy.get('input[name="password_confirmation"]').type("securePass123")
    cy.get("button[type='submit']").click()
    cy.wait("@registerRequest").its("request.body").should("deep.include", {
      first_name: "Danait",
      last_name: "Semere",
      phone_number: "1234567890",
      password: "securePass123",
      user_type: "CLINICIAN"
    })
    cy.url().should("include", "/login")
  })

  it("should display API error if registration fails", () => {
    cy.intercept("POST", "/api/register", { statusCode: 400, body: { error: "Phone number already in use" } }).as("registerRequest")
    cy.get('input[name="first_name"]').type("Victoria")
    cy.get('input[name="last_name"]').type("Ogega")
    cy.get('input[name="phone_number"]').type("0987654321")
    cy.get('input[name="password"]').type("pass123")
    cy.get('input[name="password_confirmation"]').type("pass123")
    cy.get("button[type='submit']").click()
    cy.wait("@registerRequest")
    cy.contains("Failed to register: Registration failed:").should("be.visible")
  })
})

describe("Login Page", () => {
  beforeEach(() => {
    cy.visit("/login", {
      onBeforeLoad(win) {
        injectAuth(win, tokenValue)
      }
    })
  })

  it("displays the login form correctly", () => {
    cy.contains("Login").should("be.visible")
    cy.get('input[name="phone_number"]').should("be.visible")
    cy.get('input[name="password"]').should("be.visible")
    cy.contains("Don't have an account?").should("be.visible")
  })

  it("allows toggling password visibility", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password")
    cy.get('button[aria-label="Show password"]').click()
    cy.get('input[name="password"]').should("have.attr", "type", "text")
  })

  it("redirects to dashboard after successful login when user has a clinic", () => {
    cy.intercept("POST", "**/api/**/login**", (req) => {
      req.reply({ statusCode: 200, body: { token: "fake-token", user_id: "12345" } })
    }).as("loginRequest")
    cy.intercept("GET", "**/api/**/centers**", (req) => {
      req.reply({ statusCode: 200, body: { centers: [{ id: "1", name: "HaliCare Test Clinic", contact: "1234567890", address: "123 Health Street", opening_time: "08:00", closing_time: "17:00", image_url: "/default.png" }] } })
    }).as("checkClinic")
    
    cy.intercept("GET", "/api/users**", { body: mockUsers }).as("getUsers")
    cy.intercept("GET", "/api/appointments**", { body: mockAppointments }).as("getAppointments")
    cy.intercept("GET", "/api/services**", { body: mockServices }).as("getServices")
    
    cy.get('input[name="phone_number"]').clear().type("1234567890")
    cy.get('input[name="password"]').clear().type("securePass123")
    cy.get("button[type='submit']").click()
    cy.wait("@loginRequest").then((interception) => {
      const tokenFromResponse = interception.response?.body?.token || tokenValue
      cy.window().then((win) => {
        try { win.localStorage.setItem(tokenKey, tokenFromResponse) } catch (e) {}
      })
    })
    cy.wait("@checkClinic")
    cy.wait("@getUsers")
    cy.wait("@getAppointments")
    cy.wait("@getServices")
    
    cy.url().should("include", "/dashboard")
    cy.contains("Total Patients").should("be.visible")
    cy.contains("Appointments").should("be.visible")
    cy.contains("ARV Refills").should("be.visible")
  })

  it("shows error message on failed login", () => {
    cy.intercept("POST", "**/api/**/login**", { statusCode: 401, body: { error: "Invalid phone or password" } }).as("loginFail")
    cy.get('input[name="phone_number"]').clear().type("1111111111")
    cy.get('input[name="password"]').clear().type("wrongpass")
    cy.get("button[type='submit']").click()
    cy.wait("@loginFail")
    cy.contains("Failed to login: Login failed: Unauthorized").should("be.visible")
  })
})

describe("Dashboard Page", () => {
  before(() => {
    Cypress.on("uncaught:exception", (err) => {
      if (err && err.message && err.message.includes && err.message.includes("Minified React error #418")) {
        return false
      }
    })
  })

  beforeEach(() => {
  
    cy.intercept("GET", "**/api/**/centers**", {
      statusCode: 200,
      body: { centers: [{ id: "1", name: "HaliCare Test Clinic" }] }
    }).as("checkClinic")

  
    cy.intercept("GET", "/api/users**", { body: mockUsers }).as("getUsers")
    cy.intercept("GET", "/api/appointments**", { body: mockAppointments }).as("getAppointments")
    cy.intercept("GET", "/api/services**", { body: mockServices }).as("getServices")

    cy.visit("/dashboard", {
      onBeforeLoad(win) {
        injectAuth(win, tokenValue)
      }
    })

 
    cy.wait("@getUsers")
    cy.wait("@getAppointments")
    cy.wait("@getServices")
  })

  it("loads", () => {
    cy.get("canvas").should("have.length", 3)
  })

  it("shows total patients count", () => {
    const patientUserIds = new Set(mockUsers.filter(u => u.user_type.toLowerCase() === "patient").map(u => u.user_id))
    const appointmentUserIds = new Set(mockAppointments.map(a => a.user_id))
    const totalPatients = [...patientUserIds].filter(id => appointmentUserIds.has(id)).length
    cy.contains(totalPatients.toString()).should("exist")
  })

  it("shows appointment statuses", () => {
    cy.contains(/Completed/i).should("exist")
    cy.contains(/Cancelled/i).should("exist")
  })

  it("shows service names on page", () => {
    cy.contains(/HIV Testing|Family Planning|Immunization|Maternal Care|Child Health|TB Screening|Counseling/i).should("exist")
  })

  it("renders all charts", () => {
    cy.get("canvas").should("have.length", 3)
  })

  it("displays pie chart for appointments", () => {
    cy.contains(/Completed|Cancelled/i).should("exist")
  })

  it("displays doughnut chart for services", () => {
    cy.contains(/ARV Refills|Counselling|Testing/i).should("exist")
  })

  it("displays bar chart for monthly patients", () => {
    cy.contains(/Number of patients/i).should("exist")
  })

  it("renders sidebar with navigation items", () => {
    cy.get("nav").should("exist")
    cy.contains(/Dashboard/i).should("exist")
    cy.contains(/Appointments/i).should("exist")
  })
})

describe("Appointments Page", () => {
  beforeEach(() => {
    const appointmentsFixture = [...mockAppointments]
    const usersFixture = [
      { user_id: "1", user_type: "PATIENT", first_name: "Alice", last_name: "Smith", phone_number: "700000001" },
      { user_id: "2", user_type: "PATIENT", first_name: "Bob", last_name: "Jones", phone_number: "700000002" },
      { user_id: "3", user_type: "PATIENT", first_name: "Charlie", last_name: "Brown", phone_number: "700000003" },
      { user_id: "4", user_type: "PATIENT", first_name: "Dana", last_name: "White", phone_number: "700000004" }
    ]
    const servicesFixture = [
      { service_id: "1", service_name: "ARV Refills" },
      { service_id: "2", service_name: "Counselling" },
      { service_id: "3", service_name: "Testing" }
    ]
    cy.intercept("GET", "**/api/appointments**", { statusCode: 200, body: appointmentsFixture }).as("getAppointments")
    cy.intercept("GET", "**/api/users**", { statusCode: 200, body: usersFixture }).as("getUsers")
    cy.intercept("GET", "**/api/services**", { statusCode: 200, body: servicesFixture }).as("getServices")
    cy.visit("/appointments", {
      timeout: 120000,
      onBeforeLoad(win) {
        injectAuth(win, tokenValue)
      }
    })
    cy.wait("@getAppointments")
    cy.wait("@getUsers")
    cy.wait("@getServices")
  })

  it("renders header, sidebar, table and controls", () => {
    cy.get("nav").should("exist")
    cy.contains("Patients").should("exist")
    cy.contains("Contacts").should("exist")
    cy.contains("Service Name").should("exist")
    cy.get("table").should("exist")
    cy.get("tbody tr").its("length").should("be.gte", 1)
    cy.get('input[placeholder="Search by patient name"]').should("be.visible")
    cy.contains("All").should("exist")
    cy.contains("Upcoming").should("exist")
    cy.contains("Completed").should("exist")
    cy.contains("Cancelled").should("exist")
  })

  it("search filters patient names and shows empty state", () => {
    cy.get('input[placeholder="Search by patient name"]').as("searchInput").should("be.visible")
    cy.get("@searchInput").clear().type("Alice")
    cy.wait(300)
    cy.contains("Alice").should("exist")
    cy.get("@searchInput").clear().type("NoSuchPersonXYZ")
    cy.wait(300)
    cy.contains("No appointments found").should("exist")
    cy.get("@searchInput").clear()
  })

  it("tabs filter statuses and pagination works", () => {
    cy.contains("Completed").click()
    cy.wait(200)
    cy.get("tbody tr").each(($tr) => {
      cy.wrap($tr).contains(/Completed/).should("exist")
    })
    cy.contains("All").click()
    cy.wait(200)
    cy.get("tbody tr").its("length").then((len) => {
      if (len > 5) {
        cy.contains("Next").click()
        cy.wait(200)
        cy.contains("Previous").click()
        cy.wait(200)
      }
    })
  })
})

describe("Services Page (token from login + search + network stubs)", () => {
  const origin = "https://halicare-gules.vercel.app"
  const servicesPath = "/services"
  const defaultTokenValue = Cypress.env("ACCESS_TOKEN") || "test-token"

  beforeEach(() => {
    Cypress.config("pageLoadTimeout", 120000)
    Cypress.config("defaultCommandTimeout", 120000)
  })

  it("logs in, takes token, visits services, and performs a search (prevents unauthorized errors)", () => {
    cy.intercept("POST", "**/api/**/login**", (req) => {
      req.reply({ statusCode: 200, body: { token: "real-token-from-login", user_id: "u-login-1" } })
    }).as("loginRequest")

    cy.visit("/login")
    cy.get('input[name="phone_number"]').type("9999999999")
    cy.get('input[name="password"]').type("loginPass123")
    cy.get("button[type='submit']").click()

    cy.wait("@loginRequest").then((interception) => {
      const tokenFromResponse = interception.response?.body?.token || defaultTokenValue
      cy.window().then((win) => {
        try { win.localStorage.setItem(tokenKey, tokenFromResponse) } catch (e) {}
      })
      const servicesFixture = [...mockServices]

      cy.intercept("GET", "**/api/**/services**", (req) => {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || ""
        if (!authHeader || (!authHeader.includes(tokenFromResponse) && !authHeader.includes("Bearer"))) {
          req.reply({ statusCode: 401, body: { error: "Unauthorized" } })
        } else {
          req.reply({ statusCode: 200, body: servicesFixture })
        }
      }).as("getServicesApi")

      const clinicsFixture = [
        { center_id: "c1", name: "Test Clinic", contact_number: "+123456789", address: "123 Test St" }
      ]
      cy.intercept("GET", "**/api/**/clinics**", (req) => {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || ""
        if (!authHeader || (!authHeader.includes(tokenFromResponse) && !authHeader.includes("Bearer"))) {
          req.reply({ statusCode: 401, body: { error: "Unauthorized" } })
        } else {
          req.reply({ statusCode: 200, body: clinicsFixture })
        }
      }).as("getClinicsApi")

      cy.intercept("POST", "**/api/**/services**", (req) => {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || ""
        if (!authHeader || !authHeader.includes(tokenFromResponse)) {
          req.reply({ statusCode: 401, body: { error: "Unauthorized" } })
        } else {
          req.reply({ statusCode: 201, body: { service_id: "s-new", ...req.body } })
        }
      }).as("postServiceApi")

      cy.intercept("PUT", "**/api/**/services/**", (req) => {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || ""
        if (!authHeader || !authHeader.includes(tokenFromResponse)) {
          req.reply({ statusCode: 401, body: { error: "Unauthorized" } })
        } else {
          req.reply({ statusCode: 200, body: { service_id: req.url.split("/").pop() || "s1", ...req.body } })
        }
      }).as("putServiceApi")

      cy.intercept("DELETE", "**/api/**/services/**", (req) => {
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || ""
        if (!authHeader || !authHeader.includes(tokenFromResponse)) {
          req.reply({ statusCode: 401, body: { error: "Unauthorized" } })
        } else {
          req.reply({ statusCode: 200, body: { success: true } })
        }
      }).as("deleteServiceApi")

      cy.visit(origin + servicesPath, {
        timeout: 120000,
        onBeforeLoad(win) {
          try { win.localStorage.setItem(tokenKey, tokenFromResponse) } catch (e) {}
        }
      })

      cy.wait("@getServicesApi").its("request.headers.authorization").should("exist").and((auth) => {
        expect(auth).to.include(tokenFromResponse)
      })

      cy.contains(/Add Services|Opening Hours|No match found/i, { timeout: 120000 }).should("exist")

      cy.get("input[placeholder*='Search'], input[placeholder*='search']", { timeout: 120000 }).first().should("be.visible").as("searchInput")
      cy.get("@searchInput").clear().type("HIV Testing")
      cy.wait(500)
      cy.contains("HIV Testing").should("exist")
      cy.get("@searchInput").clear().type("NonExistingServiceXYZ")
      cy.wait(500)
      cy.contains(/No match found|No services|No results/i).should("exist")
    })
  })

  it("can open Add Service modal and create a service (using stored token)", () => {
    cy.window().then((win) => {
      try { if (!win.localStorage.getItem(tokenKey)) { win.localStorage.setItem(tokenKey, defaultTokenValue) } } catch (e) {}
    })

    cy.intercept("GET", "**/api/**/services**", { statusCode: 200, body: mockServices }).as("getServicesApi")
    cy.intercept("GET", "**/api/**/clinics**", { statusCode: 200, body: [{ center_id: "c1", name: "Test Clinic" }] }).as("getClinicsApi")
    cy.intercept("POST", "**/api/**/services**", (req) => { req.reply({ statusCode: 201, body: { service_id: "s-new", ...req.body } }) }).as("postServiceApi")

    cy.visit(origin + servicesPath, {
      timeout: 120000,
      onBeforeLoad(win) { try { win.localStorage.setItem(tokenKey, win.localStorage.getItem(tokenKey) || defaultTokenValue) } catch (e) {} }
    })

    cy.contains(/Add Services|Add Service/i, { timeout: 120000 }).click({ force: true })
    cy.get('[role="dialog"], .modal', { timeout: 10000 }).should("be.visible")
    cy.get("input[placeholder*='Service Name'], input[type='text']").filter(":visible").first().clear().type("New Service from Test")
    cy.get("textarea").filter(":visible").first().clear().type("Created by Cypress test")
    cy.contains("button", /(Add Service|Save|Add|Create)/i, { timeout: 5000 }).click()
    cy.wait("@postServiceApi")
    cy.contains("New Service from Test", { timeout: 10000 }).should("exist")
  })

  it("can update and delete a service (using stored token)", () => {
    cy.window().then((win) => {
      try { if (!win.localStorage.getItem(tokenKey)) { win.localStorage.setItem(tokenKey, defaultTokenValue) } } catch (e) {}
    })

    cy.intercept("GET", "**/api/**/services**", { statusCode: 200, body: mockServices }).as("getServicesApi")
    cy.intercept("PUT", "**/api/**/services/**", (req) => { req.reply({ statusCode: 200, body: { service_id: req.url.split("/").pop() || "s1", ...req.body } }) }).as("putServiceApi")
    cy.intercept("DELETE", "**/api/**/services/**", { statusCode: 200, body: { success: true } }).as("deleteServiceApi")

    cy.visit(origin + servicesPath, {
      timeout: 120000,
      onBeforeLoad(win) { try { win.localStorage.setItem(tokenKey, win.localStorage.getItem(tokenKey) || defaultTokenValue) } catch (e) {} }
    })

    cy.contains("HIV Testing", { timeout: 120000 }).parents("tr").within(() => {
      cy.get("button").contains(/Edit|Update/i).first().click({ force: true })
    })
    cy.get('[role="dialog"], .modal', { timeout: 10000 }).should("be.visible")
    cy.get("input[placeholder*='Service Name'], input[type='text']").filter(":visible").first().clear().type("HIV Testing - Updated")
    cy.contains("button", /(Update|Save)/i).click()
    cy.wait("@putServiceApi")
    cy.contains("HIV Testing - Updated", { timeout: 10000 }).should("exist")
    cy.contains("HIV Testing - Updated").parents("tr").within(() => {
      cy.get("button").contains(/Delete|Remove/i).first().click({ force: true })
    })
    cy.contains("button", /Confirm/i, { timeout: 5000 }).click()
    cy.wait("@deleteServiceApi")
    cy.contains("HIV Testing - Updated").should("not.exist")
  })
})