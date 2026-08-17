import type { ConfigService } from "@nestjs/config";
import { EmailDomainService } from "./email-domain.service";

function buildService(domains: string[]): EmailDomainService {
  const configService = { get: jest.fn().mockReturnValue({ allowedEmailDomains: domains }) } as unknown as ConfigService;
  return new EmailDomainService(configService);
}

describe("EmailDomainService", () => {
  it("accepts an email on the allowed domain", () => {
    const service = buildService(["arutechconsultancy.com"]);
    expect(service.isAllowedDomain("somdev@arutechconsultancy.com")).toBe(true);
  });

  it("rejects emails from Gmail, Outlook, Yahoo, or any other domain", () => {
    const service = buildService(["arutechconsultancy.com"]);
    expect(service.isAllowedDomain("employee@gmail.com")).toBe(false);
    expect(service.isAllowedDomain("employee@outlook.com")).toBe(false);
    expect(service.isAllowedDomain("employee@yahoo.com")).toBe(false);
    expect(service.isAllowedDomain("employee@othercompany.com")).toBe(false);
  });

  it("is case-insensitive on the domain part", () => {
    const service = buildService(["arutechconsultancy.com"]);
    expect(service.isAllowedDomain("Employee@ArutechConsultancy.COM")).toBe(true);
  });

  it("rejects malformed input with no domain", () => {
    const service = buildService(["arutechconsultancy.com"]);
    expect(service.isAllowedDomain("not-an-email")).toBe(false);
  });

  it("supports multiple configured domains", () => {
    const service = buildService(["arutechconsultancy.com", "partner-arutech.com"]);
    expect(service.isAllowedDomain("a@arutechconsultancy.com")).toBe(true);
    expect(service.isAllowedDomain("b@partner-arutech.com")).toBe(true);
    expect(service.isAllowedDomain("c@gmail.com")).toBe(false);
  });
});
