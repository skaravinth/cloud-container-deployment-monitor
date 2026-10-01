import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Alert, Application, Deployment, Metric } from './models.js';

dotenv.config({ path: '../.env' });

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deployment_monitor');
await Promise.all([Alert.deleteMany({}), Deployment.deleteMany({}), Metric.deleteMany({}), Application.deleteMany({})]);

const applications = await Application.insertMany([
  { name: 'checkout-api', repository: 'acme/checkout-api', image: 'ghcr.io/acme/checkout-api:v2.8.1', environment: 'production', status: 'healthy', replicas: 6, cluster: 'us-east-1-prod' },
  { name: 'web-storefront', repository: 'acme/storefront', image: 'ghcr.io/acme/storefront:v4.2.0', environment: 'production', status: 'healthy', replicas: 4, cluster: 'us-east-1-prod' },
  { name: 'inventory-worker', repository: 'acme/inventory-worker', image: 'ghcr.io/acme/inventory-worker:v1.6.3', environment: 'staging', status: 'degraded', replicas: 3, cluster: 'us-west-2-stage' },
  { name: 'identity-service', repository: 'acme/identity', image: 'ghcr.io/acme/identity:v3.1.2', environment: 'production', status: 'deploying', replicas: 2, cluster: 'eu-west-1-prod' }
]);

const now = Date.now();
const metrics = applications.flatMap((application, appIndex) => Array.from({ length: 12 }, (_, point) => ({
  application: application.id,
  cpuPercent: Math.max(12, Math.min(92, 38 + Math.sin(point * 0.8 + appIndex) * 20 + Math.random() * 12)),
  memoryMiB: 360 + appIndex * 110 + Math.round(Math.cos(point * 0.45) * 42),
  networkMiB: 14 + Math.random() * 28,
  containerStatus: appIndex === 2 && point === 11 ? 'restarting' : 'running',
  restartCount: appIndex === 2 ? 3 : 0,
  recordedAt: new Date(now - (11 - point) * 5 * 60_000)
})));
await Metric.insertMany(metrics);
await Deployment.insertMany([
  { application: applications[0].id, image: applications[0].image, replicas: 6, status: 'succeeded', triggeredBy: 'ci-bot', createdAt: new Date(now - 18 * 60_000) },
  { application: applications[3].id, image: applications[3].image, replicas: 2, status: 'running', triggeredBy: 'maria.chen', createdAt: new Date(now - 42 * 60_000) },
  { application: applications[2].id, image: applications[2].image, replicas: 3, status: 'failed', triggeredBy: 'ci-bot', createdAt: new Date(now - 2 * 60 * 60_000) }
]);
await Alert.insertMany([
  { application: applications[2].id, type: 'CPU threshold', message: 'CPU usage above 80% for 5 minutes', threshold: 80, status: 'firing', triggeredAt: new Date(now - 9 * 60_000) },
  { application: applications[3].id, type: 'Deployment', message: 'Rollout is taking longer than expected', status: 'acknowledged', triggeredAt: new Date(now - 26 * 60_000) }
]);
console.log(`Seeded ${applications.length} applications with metrics, deployments, and alerts.`);
await mongoose.disconnect();