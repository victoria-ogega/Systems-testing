
describe("Login Page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("displays the login form correctly", () => {
    cy.contains("Login").should("be.visible");
    cy.get('input[name="phone_number"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.contains("Don't have an account?").should("be.visible");
  });

  it("allows toggling password visibility", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password");
    cy.get('button[aria-label="Show password"]').click();
    cy.get('input[name="password"]').should("have.attr", "type", "text");
  });

  it("redirects to /dashboard when user already has a clinic", () => {

    cy.intercept("POST", "/api/login", {
      statusCode: 200,
      body: { token: "fake-token", user_id: "12345" },
    }).as("loginRequest");

 
    cy.intercept("GET", "/api/centers?userId=12345", {
      statusCode: 200,
      body: {
        centers: [
          {
            id: "1",
            name: "HaliCare Test Clinic",
            contact: "1234567890",
            address: "123 Health Street",
            opening_time: "08:00",
            closing_time: "17:00",
            image_url: "/default.png"
          }
        ]
      },
    }).as("checkClinic");


    cy.get('input[name="phone_number"]').type("1234567890");
    cy.get('input[name="password"]').type("securePass123");
    cy.get("button[type='submit']").click();

 
    cy.wait("@loginRequest");
    cy.wait("@checkClinic");


    cy.url().should("eq", "https://halicare-gules.vercel.app/dashboard");

    cy.contains("Total Patients").should("be.visible");
    cy.contains("Appointments").should("be.visible");
    cy.contains("ARV Refills").should("be.visible");
  });

  it("redirects to /clinic_registration when user has no clinic", () => {
    cy.intercept("POST", "/api/login", {
      statusCode: 200,
      body: { token: "fake-token", user_id: "67890" },
    }).as("loginRequest");


    cy.intercept("GET", "/api/centers?userId=67890", {
      statusCode: 200,
      body: { centers: [] },
    }).as("checkClinic");

    cy.get('input[name="phone_number"]').type("0987654321");
    cy.get('input[name="password"]').type("anotherPass456");
    cy.get("button[type='submit']").click();

    cy.wait("@loginRequest");
    cy.wait("@checkClinic");

    cy.url().should("eq", "https://halicare-gules.vercel.app/clinic_registration");


    cy.contains("Welcome to HaliCare").should("be.visible");
    cy.contains("Clinic Name").should("be.visible");
    cy.contains("Contact Number").should("be.visible");
    cy.contains("Address").should("be.visible");
    cy.contains("Opening Time").should("be.visible");
    cy.contains("Closing Time").should("be.visible");
    cy.contains("Save").should("be.visible");
  });

  it("shows error message on failed login", () => {
    cy.intercept("POST", "/api/login", {
      statusCode: 401,
      body: { error: "Invalid phone or password" },
    });

    cy.get('input[name="phone_number"]').type("1111111111");
    cy.get('input[name="password"]').type("wrongpass");
    cy.get("button[type='submit']").click();

    cy.contains("Failed to login: Login failed: Unauthorized").should("be.visible");
  });
});