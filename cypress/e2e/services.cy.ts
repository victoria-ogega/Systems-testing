describe("Services Page (localStorage auth + network stubs)", () => {
 const origin = "https://halicare-gules.vercel.app";
 const servicesPath = "/services";
 const tokenKey = Cypress.env("LOCAL_STORAGE_KEY") || "token";
 const tokenValue = Cypress.env("ACCESS_TOKEN") || "test-token";


 beforeEach(() => {
   Cypress.config("pageLoadTimeout", 120000);
   Cypress.config("defaultCommandTimeout", 120000);


   const servicesFixture = [
     { service_id: "s1", service_name: "HIV Testing", status: "Available", description: "Rapid HIV testing and counseling" },
     { service_id: "s2", service_name: "Family Planning", status: "Available", description: "Contraception services" },
     { service_id: "s3", service_name: "Immunization", status: "Available", description: "Child immunizations" },
     { service_id: "s4", service_name: "Maternal Care", status: "Available", description: "Antenatal and postnatal care" },
     { service_id: "s5", service_name: "Child Health", status: "Available", description: "Pediatric consultations" },
     { service_id: "s6", service_name: "TB Screening", status: "Not Available", description: "TB screening services" },
     { service_id: "s7", service_name: "Counseling", status: "Available", description: "Psychosocial counseling" }
   ];


   const clinicsFixture = [
     { center_id: "c1", name: "Test Clinic", contact_number: "+123456789", address: "123 Test St" }
   ];


   cy.intercept("GET", "**/api/**/services**", { statusCode: 200, body: servicesFixture }).as("getServicesApi");
   cy.intercept("GET", "**/api/**/clinics**", { statusCode: 200, body: clinicsFixture }).as("getClinicsApi");
   cy.intercept("POST", "**/api/**/services**", (req) => {
     req.reply({ statusCode: 201, body: { service_id: "s-new", ...req.body } });
   }).as("postServiceApi");
   cy.intercept("PUT", "**/api/**/services/**", (req) => {
     req.reply({ statusCode: 200, body: { service_id: req.url.split("/").pop() || "s1", ...req.body } });
   }).as("putServiceApi");
   cy.intercept("DELETE", "**/api/**/services/**", { statusCode: 200, body: { success: true } }).as("deleteServiceApi");


   cy.visit(origin + servicesPath, {
     timeout: 120000,
     onBeforeLoad(win) {
       try { win.localStorage.setItem(tokenKey, tokenValue); } catch (e) {}
     }
   });


   cy.contains(/Add Services|Opening Hours|No match found/i, { timeout: 120000 }).should("exist");
 });


 it("shows cards and main controls", () => {
   cy.contains(/Opening Hours/i, { timeout: 120000 }).should("exist");
   cy.contains(/Closing Hours/i).should("exist");
   cy.contains(/ARV Medication Status|ARV/i).should("exist");
   cy.contains(/Clinic Operational Status|Operational Status/i).should("exist");
   cy.contains("8:00 AM").should("exist");
   cy.contains("8:00 PM").should("exist");
   cy.get("input[placeholder*='Search'], input[placeholder*='search']", { timeout: 120000 }).first().should("be.visible");
 });


 it("shows services table or empty state", () => {
   cy.get("table", { timeout: 120000 }).then(($table) => {
     if ($table.length > 0) {
       cy.get("thead").should("exist");
       cy.get("tbody tr").its("length").should("be.gte", 0);
     } else {
       cy.contains(/No match found|No services|No results/i, { timeout: 120000 }).should("exist");
     }
   });
 });


 it("can open Add Service modal and create a service", () => {
   cy.contains(/Add Services|Add Service/i, { timeout: 120000 }).click({ force: true });
   cy.get('[role="dialog"], .modal', { timeout: 10000 }).should("be.visible");
   cy.get("input[placeholder*='Service Name'], input[type='text']").filter(":visible").first().clear().type("New Service from Test");
   cy.get("textarea").filter(":visible").first().clear().type("Created by Cypress test");
   cy.contains("button", /(Add Service|Save|Add|Create)/i, { timeout: 5000 }).click();
   cy.wait("@postServiceApi");
   cy.contains("New Service from Test", { timeout: 10000 }).should("exist");
 });


 it("can update and delete a service", () => {
   cy.contains("HIV Testing", { timeout: 120000 }).parents("tr").within(() => {
     cy.get("button").contains(/Edit|Update/i).first().click({ force: true });
   });
   cy.get('[role="dialog"], .modal', { timeout: 10000 }).should("be.visible");
   cy.get("input[placeholder*='Service Name'], input[type='text']").filter(":visible").first().clear().type("HIV Testing - Updated");
   cy.contains("button", /(Update|Save)/i).click();
   cy.wait("@putServiceApi");
   cy.contains("HIV Testing - Updated", { timeout: 10000 }).should("exist");
   cy.contains("HIV Testing - Updated").parents("tr").within(() => {
     cy.get("button").contains(/Delete|Remove/i).first().click({ force: true });
   });
   cy.contains("button", /Confirm/i, { timeout: 5000 }).click();
   cy.wait("@deleteServiceApi");
   cy.contains("HIV Testing - Updated").should("not.exist");
 });
});

