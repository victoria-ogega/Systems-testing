const mockUsers = [
  { user_id: "1", user_type: "patient", email: "alice@example.com", first_name: "Alice", last_name: "Smith" },
  { user_id: "2", user_type: "patient", email: "bob@example.com", first_name: "Bob", last_name: "Jones" },
  { user_id: "3", user_type: "admin", email: "admin@example.com", first_name: "Admin", last_name: "" },
  { user_id: "4", user_type: "patient", email: "charlie@example.com", first_name: "Charlie", last_name: "Brown" },
];

const mockAppointments = [
  { appointment_id: "1", user_id: "1", service_id: "1", booking_status: "Completed", appointment_date: "2025-01-15T10:00:00Z" },
  { appointment_id: "2", user_id: "1", service_id: "2", booking_status: "Completed", appointment_date: "2025-02-20T11:00:00Z" },
  { appointment_id: "3", user_id: "2", service_id: "3", booking_status: "Cancelled", appointment_date: "2025-03-10T09:00:00Z" },
  { appointment_id: "4", user_id: "4", service_id: "1", booking_status: "Completed", appointment_date: "2025-01-05T14:00:00Z" },
];

const mockServices = [
  { service_id: "1", service_name: "ARV Refills" },
  { service_id: "2", service_name: "Counselling" },
  { service_id: "3", service_name: "Testing" },
  { service_id: "4", service_name: "ARV Refills" },
];

describe("Dashboard Page", () => {
  before(() => {
    Cypress.on("uncaught:exception", (err) => {
      if (err.message.includes("Minified React error #418")) {
        return false;
      }
    });
  });

  beforeEach(() => {
    cy.intercept("GET", "/api/users**", { body: mockUsers }).as("getUsers");
    cy.intercept("GET", "/api/appointments**", { body: mockAppointments }).as("getAppointments");
    cy.intercept("GET", "/api/services**", { body: mockServices }).as("getServices");

    cy.visit("/dashboard");
  });

  it("loads", () => {
    cy.get("canvas").should("have.length", 3);
  });

  it("fetches all required data", () => {
    cy.wait("@getUsers", { timeout: 10000 });
    cy.wait("@getServices", { timeout: 10000 });


  it("shows total patients count", () => {
    const patientUserIds = new Set(
      mockUsers.filter(u => u.user_type.toLowerCase() === "patient").map(u => u.user_id)
    );
    const appointmentUserIds = new Set(mockAppointments.map(a => a.user_id));
    const totalPatients = [...patientUserIds].filter(id => appointmentUserIds.has(id)).length;

    cy.contains(totalPatients.toString()).should("exist");
  });

  it("shows appointment statuses", () => {
    cy.contains(/Completed/i).should("exist");
    cy.contains(/Cancelled/i).should("exist");
  });


  

  it("shows service names on page", () => {
    cy.contains(/ARV Refills/i).should("exist");
    cy.contains(/Counselling/i).should("exist");
    cy.contains(/Testing/i).should("exist");
  });

  it("renders all charts", () => {
    cy.get("canvas").should("have.length", 3);
  });

  it("displays pie chart for appointments", () => {
    cy.contains(/Completed|Cancelled/i).should("exist");
  });

  it("displays doughnut chart for services", () => {
    cy.contains(/ARV Refills|Counselling|Testing/i).should("exist");
  });

  it("displays bar chart for monthly patients", () => {
    cy.contains(/Number of patients/i).should("exist");
  });

  it("renders sidebar with navigation items", () => {
    cy.get("nav").should("exist");
    cy.contains(/Dashboard/i).should("exist");
    cy.contains(/Appointments/i).should("exist");
  });
});
})
