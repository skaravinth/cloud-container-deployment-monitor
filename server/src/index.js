import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { collectDefaultMetrics, register } from 'prom-client';
import { Alert, Application, Deployment, Metric, User } from './models.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';
if (process.env.NODE_ENV === 'production' && jwtSecret === 'development-only-secret') {
  throw new Error('Set JWT_SECRET before running in production.');
}
collectDefaultMetrics();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('/metrics', async (_request, response) => {
  response.set('Content-Type', register.contentType);
  response.end(await register.metrics());
});

app.post('/api/auth/register', async (request, response, next) => {
  try {
    const { name, email, password } = request.body;
    if (!name || !email || typeof password !== 'string' || password.length < 10) {
      return response.status(400).json({ error: 'Provide a name, email, and password of at least 10 characters.' });
    }
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    response.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const user = await User.findOne({ email: String(request.body.email || '').toLowerCase() });
    const validPassword = user && await bcrypt.compare(String(request.body.password || ''), user.passwordHash);
    if (!validPassword) return response.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' });
    response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  try {
    if (!token) throw new Error('Missing token');
    request.auth = jwt.verify(token, jwtSecret);
    next();
  } catch { response.status(401).json({ error: 'Authentication required.' }); }
}

app.get('/api/overview', async (_request, response, next) => {
  try {
    const [applications, deployments, alerts, metrics] = await Promise.all([
      Application.find().sort({ updatedAt: -1 }).lean(),
      Deployment.find().populate('application', 'name').sort({ createdAt: -1 }).limit(8).lean(),
      Alert.find().populate('application', 'name').sort({ triggeredAt: -1 }).limit(8).lean(),
      Metric.find().sort({ recordedAt: -1 }).limit(100).lean()
    ]);
    response.json({ applications, deployments, alerts, metrics });
  } catch (error) { next(error); }
});

app.get('/api/applications', requireAuth, async (_request, response, next) => {
  try {
    response.json(await Application.find().sort({ updatedAt: -1 }).lean());
  } catch (error) { next(error); }
});

app.post('/api/applications', requireAuth, async (request, response, next) => {
  try {
    const application = await Application.create({
      name: request.body.name,
      repository: request.body.repository,
      image: request.body.image,
      replicas: request.body.replicas,
      cluster: request.body.cluster
    });
    response.status(201).json(application);
  } catch (error) { next(error); }
});

app.patch('/api/applications/:id', requireAuth, async (request, response, next) => {
  try {
    const application = await Application.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true }
    );
    if (!application) return response.status(404).json({ error: 'Application not found.' });
    response.json(application);
  } catch (error) { next(error); }
});

app.delete('/api/applications/:id', requireAuth, async (request, response, next) => {
  try {
    const application = await Application.findByIdAndDelete(request.params.id);
    if (!application) return response.status(404).json({ error: 'Application not found.' });
    await Promise.all([
      Deployment.deleteMany({ application: request.params.id }),
      Metric.deleteMany({ application: request.params.id }),
      Alert.deleteMany({ application: request.params.id })
    ]);
    response.status(204).end();
  } catch (error) { next(error); }
});

app.post('/api/applications/:id/deployments', requireAuth, async (request, response, next) => {
  try {
    const application = await Application.findById(request.params.id);
    if (!application) return response.status(404).json({ error: 'Application not found.' });
    const deployment = await Deployment.create({
      application: application.id,
      image: request.body.image || application.image,
      replicas: request.body.replicas ?? application.replicas,
      status: 'queued',
      triggeredBy: request.auth.sub
    });
    response.status(202).json(deployment);
  } catch (error) { next(error); }
});

app.patch('/api/alerts/:id', requireAuth, async (request, response, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      request.params.id,
      { $set: { status: request.body.status } },
      { new: true, runValidators: true }
    );
    if (!alert) return response.status(404).json({ error: 'Alert not found.' });
    response.json(alert);
  } catch (error) { next(error); }
});

app.use((error, _request, response, _next) => {
  if (error?.code === 11000) return response.status(409).json({ error: 'An account with that email already exists.' });
  if (['ValidationError', 'CastError'].includes(error?.name)) return response.status(400).json({ error: error.message });
  console.error(error);
  response.status(500).json({ error: 'Unexpected server error.' });
});

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deployment_monitor');
app.listen(port, '0.0.0.0', () => console.log(`API listening on port ${port}`));