import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { sendPasswordResetEmail } from '../email/password-reset-mailer.js';
import {
  createSessionToken,
  encryptOtpSecretForStorage,
  generateOtpSecret,
  isOtpEnabled,
  SESSION_TTL_SECONDS,
  validOtpTimestep,
  verifyAndConsumeOtp
} from '../auth/session.js';

const invalidCredentials = { error: 'Invalid email, password, or two-factor code' };

const resetRequestMessage = { message: 'If an account exists for that email, password reset instructions will be sent.' };
const passwordResetTtlHours = 6;

export function createAuthRouter(store, {
  apiAccessToken,
  otpSecretEncryptionKey,
  sendResetEmail = sendPasswordResetEmail
} = {}) {
  const router = Router();

  function normalizeProfileName(value) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 255);
  }

  function requireUser(req, res) {
    if (req.authUser) return true;
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  async function securitySettings(userId) {
    const settings = await store.getUserOtpSettings(userId);
    return settings ? {
      otp_enabled: isOtpEnabled(settings),
      otp_configured: Boolean(settings.encrypted_otp_secret)
    } : null;
  }

  router.post('/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || email.length > 255 || !password || password.length > 1024) {
      return res.status(401).json(invalidCredentials);
    }

    const user = await store.getUserByEmail(email);
    let passwordMatches = false;
    if (user?.encrypted_password) {
      try {
        passwordMatches = await bcrypt.compare(password, user.encrypted_password);
      } catch {
        passwordMatches = false;
      }
    }
    if (!passwordMatches || !(await verifyAndConsumeOtp(user, req.body.otp_attempt, store, otpSecretEncryptionKey))) {
      return res.status(401).json(invalidCredentials);
    }

    const token = createSessionToken(user, apiAccessToken);
    if (!token) return res.status(503).json({ error: 'Authentication is not configured' });

    await store.recordUserSignIn(user.id, req.ip);
    return res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: SESSION_TTL_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      }
    });
  });

  router.post('/password-reset', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email && email.length <= 255) {
      const user = await store.getUserByEmail(email);
      if (user) {
        const token = randomBytes(32).toString('base64url');
        const tokenDigest = createHash('sha256').update(token).digest('hex');
        await store.createPasswordReset(user.id, tokenDigest);
        try {
          await sendResetEmail({ email: user.email, token, expiresInHours: passwordResetTtlHours });
        } catch (error) {
          console.error('Password reset email delivery failed:', error.message);
        }
      }
    }
    return res.status(202).json(resetRequestMessage);
  });

  router.post('/password-reset/confirm', async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (token.length < 32 || token.length > 128 || password.length < 8 || password.length > 1024) {
      return res.status(400).json({ error: 'Use a valid reset link and a password with at least 8 characters.' });
    }

    const tokenDigest = createHash('sha256').update(token).digest('hex');
    const encryptedPassword = await bcrypt.hash(password, 10);
    if (!await store.consumePasswordReset(tokenDigest, encryptedPassword)) {
      return res.status(400).json({ error: 'This password reset link is invalid or expired. Request a new one.' });
    }
    return res.json({ message: 'Password updated. You can now sign in.' });
  });

  router.get('/session', async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = await store.getUserProfile(req.authUser.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      }
    });
  });

  router.get('/profile', async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = await store.getUserProfile(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      }
    });
  });

  router.patch('/profile', async (req, res) => {
    if (!requireUser(req, res)) return;
    const firstName = normalizeProfileName(req.body?.first_name);
    const lastName = normalizeProfileName(req.body?.last_name);
    const user = await store.updateUserProfile(req.authUser.id, {
      first_name: firstName,
      last_name: lastName
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || ''
      },
      message: 'Profile updated.'
    });
  });

  router.post('/password', async (req, res) => {
    if (!requireUser(req, res)) return;
    const currentPassword = typeof req.body?.current_password === 'string' ? req.body.current_password : '';
    const newPassword = typeof req.body?.new_password === 'string' ? req.body.new_password : '';
    if (newPassword.length < 8 || newPassword.length > 1024) {
      return res.status(400).json({ error: 'New password must be between 8 and 1024 characters.' });
    }

    const user = await store.getUserPassword(req.authUser.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.encrypted_password))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Choose a new password different from the current password.' });
    }

    const encryptedPassword = await bcrypt.hash(newPassword, 10);
    await store.updateUserPassword(req.authUser.id, encryptedPassword);
    return res.json({ message: 'Password updated.' });
  });

  router.get('/security', async (req, res) => {
    if (!requireUser(req, res)) return;
    const settings = await securitySettings(req.authUser.id);
    if (!settings) return res.status(404).json({ error: 'User not found' });
    return res.json(settings);
  });

  router.post('/otp/setup', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!otpSecretEncryptionKey) return res.status(503).json({ error: 'OTP secret encryption is not configured' });

    const user = await store.getUserOtpSettings(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isOtpEnabled(user)) return res.status(409).json({ error: 'Disable two-factor authentication before replacing its secret' });

    const secret = generateOtpSecret();
    const encryptedSecret = encryptOtpSecretForStorage(secret, otpSecretEncryptionKey);
    if (!await store.saveUserOtpSecret(req.authUser.id, encryptedSecret)) {
      return res.status(409).json({ error: 'Two-factor settings changed; reload and try again' });
    }
    const label = encodeURIComponent(`SeferBiz:${req.authUser.email}`);
    const issuer = encodeURIComponent('SeferBiz');
    return res.json({
      secret,
      otpauth_uri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
    });
  });

  router.post('/otp/enable', async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = await store.getUserOtpSettings(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (isOtpEnabled(user)) return res.json(await securitySettings(req.authUser.id));
    if (!user.encrypted_otp_secret) return res.status(409).json({ error: 'Set up an authenticator before enabling two-factor authentication' });

    const timestep = validOtpTimestep(user, req.body?.otp_attempt, otpSecretEncryptionKey);
    if (timestep === null || !await store.consumeUserOtp(req.authUser.id, timestep)) {
      return res.status(401).json({ error: 'Invalid two-factor code' });
    }
    if (!await store.enableUserOtp(req.authUser.id)) {
      return res.status(409).json({ error: 'Two-factor settings changed; reload and try again' });
    }
    return res.json(await securitySettings(req.authUser.id));
  });

  router.post('/otp/disable', async (req, res) => {
    if (!requireUser(req, res)) return;
    const user = await store.getUserOtpSettings(req.authUser.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!isOtpEnabled(user)) return res.json(await securitySettings(req.authUser.id));
    if (!(await verifyAndConsumeOtp(user, req.body?.otp_attempt, store, otpSecretEncryptionKey))) {
      return res.status(401).json({ error: 'Invalid two-factor code' });
    }
    await store.disableUserOtp(req.authUser.id);
    return res.json(await securitySettings(req.authUser.id));
  });

  return router;
}

export default { createAuthRouter };
