import { invitationEmail } from "./invitation.template";

describe("invitationEmail", () => {
  it("escapes an attacker-controlled invitedByName before it reaches the HTML body", () => {
    const { html } = invitationEmail({
      recipientEmail: "victim@arutechconsultancy.com",
      organizationName: "Arutech Consultancy Services LLP",
      invitedByName: '<img src=x onerror=alert(1)><a href="https://evil.example">fake link</a>',
      acceptUrl: "http://localhost:3000/register?token=abc",
      expiresAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("leaves a normal name untouched", () => {
    const { html } = invitationEmail({
      recipientEmail: "victim@arutechconsultancy.com",
      organizationName: "Arutech Consultancy Services LLP",
      invitedByName: "Priya Sharma",
      acceptUrl: "http://localhost:3000/register?token=abc",
      expiresAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(html).toContain("<strong>Priya Sharma</strong>");
  });
});
