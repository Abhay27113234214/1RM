/**
 * workout.seed.js / seed.js
 * Imports 232 exercises from db.json into MongoDB Atlas (idempotent bulk upsert).
 * Can be run standalone via CLI or automatically invoked on server startup.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Exercise } from '../workout_model/workout.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/1rm';
const dbJsonPath = path.resolve(rootDir, 'db.json');

/**
 * Reads db.json and bulk-upserts all exercises into MongoDB.
 */
export async function seedExercisesData() {
  if (!fs.existsSync(dbJsonPath)) {
    throw new Error(`Could not find db.json at ${dbJsonPath}`);
  }

  const rawData = fs.readFileSync(dbJsonPath, 'utf-8');
  const dbData = JSON.parse(rawData);
  const rawExercises = dbData.exercises || [];

  if (rawExercises.length === 0) {
    console.warn('[Seed] No exercises found in db.json to seed.');
    return { count: 0 };
  }

  const bulkOps = rawExercises.map((ex) => ({
    updateOne: {
      filter: { name: ex.name.trim() },
      update: {
        $set: {
          name: ex.name.trim(),
          asset: ex.asset || 'None',
          equipment_type: ex.equipment_type || 'other',
          primary_muscle_group: (ex.primary_muscle_group || 'other').trim().toLowerCase(),
          other_muscles: Array.isArray(ex.other_muscles) ? ex.other_muscles : [],
          exercise_type: ex.exercise_type || 'weight_and_reps',
          measurement: Array.isArray(ex.measurement) ? ex.measurement : ['reps', 'kg'],
          is_custom: false,
        },
      },
      upsert: true,
    },
  }));

  const result = await Exercise.bulkWrite(bulkOps);
  const total = await Exercise.countDocuments();
  return { result, total };
}

/**
 * Checks if the Exercise collection is empty; if so, automatically seeds from db.json.
 */
export async function autoSeedIfEmpty() {
  try {
    const count = await Exercise.countDocuments();
    if (count === 0) {
      console.log('[Auto-Seed] Database is empty. Auto-seeding 232 exercises from db.json...');
      const { total } = await seedExercisesData();
      console.log(`[Auto-Seed] Done! ${total} exercises now available in MongoDB.`);
    } else {
      console.log(`[Auto-Seed] Database already initialized (${count} exercises found).`);
    }
  } catch (err) {
    console.error('[Auto-Seed] Warning: Could not auto-seed exercises:', err.message);
  }
}

// Standalone execution handler (when run directly via `node workout.seed.js`)
const isDirectlyExecuted =
  process.argv[1] &&
  (pathToFileURL(process.argv[1]).href === import.meta.url ||
    process.argv[1].endsWith('workout.seed.js') ||
    process.argv[1].endsWith('seed.js'));

if (isDirectlyExecuted) {
  (async () => {
    try {
      console.log('--------------------------------------------------');
      console.log('[Seed CLI] Connecting to MongoDB...');
      await mongoose.connect(MONGO_URI);
      console.log('[Seed CLI] Connected. Seeding exercises...');
      const { result, total } = await seedExercisesData();
      console.log('[Seed CLI] Bulk write completed:');
      console.log(`  - Matched existing: ${result.matchedCount}`);
      console.log(`  - Upserted:         ${result.upsertedCount}`);
      console.log(`  - Total in DB:      ${total}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error('[Seed CLI] Error:', err.message);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}

export default { seedExercisesData, autoSeedIfEmpty };
