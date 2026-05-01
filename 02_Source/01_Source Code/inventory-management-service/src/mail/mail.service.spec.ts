jest.mock('nodemailer');
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

describe('MailService (inventory-management-service)', () => {
  const sendMailMock = jest.fn();
  const mockConfig: any = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'MAIL_USER':
          return 'test@example.com';
        case 'MAIL_PASS':
          return 'secret';
        case 'FRONTEND_URL':
          return 'https://frontend.test';
        default:
          return undefined;
      }
    }),
  };

  beforeEach(() => {
    const nodemailerModule = require('nodemailer') as any;
    jest
      .spyOn(nodemailerModule, 'createTransport')
      .mockReturnValue({ sendMail: sendMailMock });
    sendMailMock.mockReset();
  });

  it('generateTempPassword -> basic requirements', () => {
    const svc = new MailService(mockConfig);
    const pw = svc.generateTempPassword();
    expect(typeof pw).toBe('string');
    expect(pw.length).toBeGreaterThanOrEqual(9);
    expect(/[A-Z]/.test(pw)).toBeTruthy();
    expect(/\d/.test(pw)).toBeTruthy();
    expect(/[@#$!]/.test(pw)).toBeTruthy();
  });

  it('sendResetPasswordEmail -> sends with reset link', async () => {
    sendMailMock.mockResolvedValue({});
    const svc = new MailService(mockConfig);
    const to = 'op@domain.test';
    const link = 'https://reset-here';
    await svc.sendResetPasswordEmail(to, 'operator', link);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe(to);
    expect(arg.html).toContain(link);
  });

  it('sendNewAccountEmail -> includes details and temp password', async () => {
    sendMailMock.mockResolvedValue({});
    const svc = new MailService(mockConfig);
    const to = 'mgr@domain.test';
    const username = 'manager1';
    const temp = 'Xy1@abc';
    await svc.sendNewAccountEmail(to, username, 'manager', temp);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toContain('Tài khoản của bạn đã được tạo');
    expect(arg.html).toContain(username);
    expect(arg.html).toContain(temp);
  });

  it('sendBinFlagEmail -> includes bin details and frontend link when configured', async () => {
    sendMailMock.mockResolvedValue({});
    const svc = new MailService(mockConfig);
    const to = 'manager@domain.test';
    const bin = 'BIN-123';
    await svc.sendBinFlagEmail(to, bin, 12.5, 'rec-1', 5, 10);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.subject).toContain('Bin');
    expect(arg.html).toContain(bin);
    // details link constructed from FRONTEND_URL
    expect(arg.html).toContain('https://frontend.test');
  });

  it('logs error when transporter.sendMail rejects', async () => {
    sendMailMock.mockRejectedValue('random-failure');
    const svc = new MailService(mockConfig);
    const spy = jest.spyOn((svc as any).logger, 'error');
    await svc.sendBinFlagEmail('a@b', 'BIN-Z', 10);
    expect(spy).toHaveBeenCalled();
  });
});
