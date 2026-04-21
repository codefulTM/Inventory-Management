const sendMailMock = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

import * as nodemailer from "nodemailer";
import { MailService } from "./mail.service";

describe("MailService (keycloak-service)", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: sendMailMock });
    process.env.MAIL_USER = "test@example.com";
    process.env.MAIL_PASS = "secret";
  });

  it("generateTempPassword -> contains uppercase, digit and special char", () => {
    const svc = new MailService();
    const pw = svc.generateTempPassword();
    expect(typeof pw).toBe("string");
    expect(pw.length).toBeGreaterThanOrEqual(9);
    expect(/[A-Z]/.test(pw)).toBeTruthy();
    expect(/\d/.test(pw)).toBeTruthy();
    expect(/[@#$!]/.test(pw)).toBeTruthy();
  });

  it("sendResetPasswordEmail -> calls transporter.sendMail with reset link", async () => {
    sendMailMock.mockResolvedValue({});
    const svc = new MailService();
    const to = "user@domain.test";
    const link = "https://reset.link";
    await svc.sendResetPasswordEmail(to, "username", link);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe(to);
    expect(arg.subject).toContain("Đặt lại mật khẩu");
    expect(arg.html).toContain(link);
  });

  it("sendNewAccountEmail -> includes temp password and username", async () => {
    sendMailMock.mockResolvedValue({});
    const svc = new MailService();
    const to = "new@domain.test";
    const username = "newuser";
    const temp = "Ab1@xyz";
    await svc.sendNewAccountEmail(to, username, "manager", temp);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe(to);
    expect(arg.subject).toContain("Tài khoản của bạn đã được tạo");
    expect(arg.html).toContain(username);
    expect(arg.html).toContain(temp);
  });

  it("logs error when transporter.sendMail rejects", async () => {
    sendMailMock.mockRejectedValue(new Error("SMTP down"));
    const svc = new MailService();
    const spy = jest.spyOn((svc as any).logger, "error");
    await svc.sendResetPasswordEmail("x@x", "u", "link");
    expect(spy).toHaveBeenCalled();
  });
});
