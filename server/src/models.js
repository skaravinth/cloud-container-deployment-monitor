import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'operator', 'viewer'], default: 'viewer' }
}, { timestamps: true });

const applicationSchema = new Schema({
  name: { type: String, required: true, trim: true },
  repository: { type: String, default: '' },
  image: { type: String, default: '' },
  environment: { type: String, default: 'production' },
  status: { type: String, enum: ['healthy', 'degraded', 'deploying', 'offline'], default: 'offline' },
  replicas: { type: Number, default: 1, min: 0 },
  cluster: { type: String, default: 'local' }
}, { timestamps: true });

const deploymentSchema = new Schema({
  application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  image: { type: String, required: true },
  kubernetesConfig: { type: Schema.Types.Mixed, default: {} },
  replicas: { type: Number, default: 1, min: 0 },
  status: { type: String, enum: ['queued', 'running', 'succeeded', 'failed', 'rolled-back'], default: 'queued' },
  triggeredBy: { type: String, default: 'system' }
}, { timestamps: true });

const metricSchema = new Schema({
  application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  cpuPercent: { type: Number, min: 0, max: 100, required: true },
  memoryMiB: { type: Number, min: 0, required: true },
  networkMiB: { type: Number, min: 0, default: 0 },
  containerStatus: { type: String, default: 'running' },
  restartCount: { type: Number, min: 0, default: 0 },
  recordedAt: { type: Date, default: Date.now }
});

const alertSchema = new Schema({
  application: { type: Schema.Types.ObjectId, ref: 'Application' },
  type: { type: String, required: true },
  message: { type: String, required: true },
  threshold: { type: Number },
  triggeredAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['firing', 'acknowledged', 'resolved'], default: 'firing' }
}, { timestamps: true });

export const User = model('User', userSchema);
export const Application = model('Application', applicationSchema);
export const Deployment = model('Deployment', deploymentSchema);
export const Metric = model('Metric', metricSchema);
export const Alert = model('Alert', alertSchema);