describe("Sign Up Page", () => {
  beforeEach(() => {
    cy.visit("/signup");
  });

  it("should display the sign up form", () => {
    cy.contains("Sign Up").should("be.visible");
    cy.get('input[name="first_name"]').should("be.visible");
    cy.get('input[name="last_name"]').should("be.visible");
    cy.get('input[name="phone_number"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('input[name="password_confirmation"]').should("be.visible");
  });

  it("should show password mismatch error", () => {
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="password_confirmation"]').type("different123");

    cy.contains("Passwords do not match.").should("be.visible");
  });

  it("should allow password visibility toggle", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password");
    cy.get('button[aria-label="Show password"]').click();
    cy.get('input[name="password"]').should("have.attr", "type", "text");

    cy.get('input[name="password_confirmation"]').should("have.attr", "type", "password");
    cy.get('button[aria-label="Show confirm password"]').click();
    cy.get('input[name="password_confirmation"]').should("have.attr", "type", "text");
  });

  it("should submit valid form and redirect to /login", () => {
    cy.intercept("POST", "/api/register", {
      statusCode: 201,
      body: { success: true },
    }).as("registerRequest");

    cy.get('input[name="first_name"]').type("John");
    cy.get('input[name="last_name"]').type("Doe");
    cy.get('input[name="phone_number"]').type("1234567890");
    cy.get('input[name="password"]').type("securePass123");
    cy.get('input[name="password_confirmation"]').type("securePass123");

    cy.get("button[type='submit']").click();

    cy.wait("@registerRequest").its("request.body").should("deep.include", {
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
      password: "securePass123",
      user_type: "CLINICIAN",
    });

    cy.url().should("include", "/login");
  });

  it("should display API error if registration fails", () => {
    cy.intercept("POST", "/api/register", {
      statusCode: 400,
      body: { error: "Phone number already in use" },
    }).as("registerRequest");

    cy.get('input[name="first_name"]').type("Jane");
    cy.get('input[name="last_name"]').type("Smith");
    cy.get('input[name="phone_number"]').type("0987654321");
    cy.get('input[name="password"]').type("pass123");
    cy.get('input[name="password_confirmation"]').type("pass123");

    cy.get("button[type='submit']").click();

    cy.wait("@registerRequest");
    cy.contains("Failed to register: Registration failed:").should("be.visible");
  });
});