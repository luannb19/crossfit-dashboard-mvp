/**
 * prisma/seed.ts — Realistic local dev data for InsightFlow (CrossFit box)
 *
 * Generates: 1 box (superforce), 15 users (1 GESTOR, 3 COACH, 11 ALUNO),
 * 40 workouts (last 60 days), 30 classes (last 4 weeks, capacity 10–20),
 * 300 attendance records (last 4 weeks).
 *
 * How to run (from backend/):
 *   npm run db:seed
 *   # or
 *   npx prisma db seed
 *
 * Requires: DATABASE_URL in .env and migrations applied (npx prisma migrate deploy).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BOX_ID = "superforce";

const WORKOUT_TITLES = [
  "Heavy Deadlift 5x3",
  "EMOM Pull-ups",
  "Partner AMRAP",
  "Fran (21-15-9)",
  "Helen (3 rnds)",
  "Grace (30 C&J)",
  "DT (5 rnds)",
  "Murph",
  "Cindy (AMRAP 20)",
  "Heavy Back Squat 5x5",
  "Snatch Technique",
  "Clean & Jerk Complex",
  "Ring Muscle-ups",
  "Double-unders + Wall Balls",
  "Rowing + KB Swings",
  "Box Jumps + Burpees",
  "Thruster Ladder",
  "Mobility & Stretch",
  "OHS + HSPU",
  "Deadlift + Box Step-ups",
  "AMRAP 15 Cal Row + 15 Burpees",
  "For Time: 21-15-9",
  "Chipper: 100-75-50-25",
  "Snatch Balance + OHS",
  "Strict Press 5x5",
  "Front Squat + Push Press",
  "Handstand Walk Practice",
  "Double KB Front Rack",
  "Running + Pull-ups",
  "Bench Press + Rows",
];

const WORKOUT_CATEGORIES = [
  "METCON",
  "STRENGTH",
  "TECHNIQUE",
  "MOBILITY",
] as const;

const CLASS_TITLES = [
  "WOD 6h",
  "WOD 7h",
  "WOD 12h",
  "WOD 18h",
  "Open Box",
  "Strength 7h",
  "Mobility 8h",
  "Competition Prep",
  "Beginner WOD",
  "Advanced WOD",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addHours(d: Date, h: number): Date {
  const out = new Date(d);
  out.setTime(out.getTime() + h * 60 * 60 * 1000);
  return out;
}

async function main() {
  console.log("🌱 Seeding InsightFlow (box: superforce)...");

  const seedUserEmails = [
    "gestor@superforce.com",
    "coach1@superforce.com",
    "coach2@superforce.com",
    "coach3@superforce.com",
    "aluno1@superforce.com",
    "aluno2@superforce.com",
    "aluno3@superforce.com",
    "aluno4@superforce.com",
    "aluno5@superforce.com",
    "aluno6@superforce.com",
    "aluno7@superforce.com",
    "aluno8@superforce.com",
    "aluno9@superforce.com",
    "aluno10@superforce.com",
    "aluno11@superforce.com",
  ];

  // 1) Clean in dependency order (avoid FK violations)
  await prisma.attendance.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.workout.deleteMany({ where: { boxId: BOX_ID } });
  for (const email of seedUserEmails) {
    await prisma.user.deleteMany({ where: { email } });
  }

  // 2) Create 15 users: 1 GESTOR, 3 COACH, 11 ALUNO
  const roles: Array<"GESTOR" | "COACH" | "ALUNO"> = [
    "GESTOR",
    "COACH",
    "COACH",
    "COACH",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
    "ALUNO",
  ];
  const users: { id: string; role: string }[] = [];
  for (let i = 0; i < seedUserEmails.length; i++) {
    const name =
      roles[i] === "GESTOR"
        ? "Gestor Superforce"
        : roles[i] === "COACH"
          ? `Coach ${i}`
          : `Aluno ${i - 3}`;
    const u = await prisma.user.create({
      data: {
        email: seedUserEmails[i],
        password: "demo123",
        name,
        role: roles[i],
      },
    });
    users.push({ id: u.id, role: u.role });
  }
  const alunoIds = users.filter((u) => u.role === "ALUNO").map((u) => u.id);
  const coachIds = users.filter((u) => u.role === "COACH").map((u) => u.id);
  const allMemberIds = [...alunoIds, ...coachIds];

  console.log(
    `   Created ${users.length} users (1 GESTOR, 3 COACH, 11 ALUNO).`,
  );

  // 3) Create 40 workouts across last 60 days
  const usedTitles = new Set<string>();
  for (let i = 0; i < 40; i++) {
    let title = pick(WORKOUT_TITLES);
    while (usedTitles.has(title) && usedTitles.size < WORKOUT_TITLES.length) {
      title = pick(WORKOUT_TITLES);
    }
    usedTitles.add(title);
    const daysBack = randomInt(0, 59);
    const date = daysAgo(daysBack);
    date.setUTCHours(6, 0, 0, 0);
    await prisma.workout.create({
      data: {
        boxId: BOX_ID,
        date,
        title,
        description:
          i % 3 === 0 ? `${title} — aquecimento 10min, then main.` : null,
        category: pick(WORKOUT_CATEGORIES),
        videoUrl: i % 5 === 0 ? "https://example.com/wod-video" : null,
      },
    });
  }
  console.log("   Created 40 workouts (last 60 days).");

  // 4) Create 30 classes: last 4 weeks, capacity 10–20, realistic times (6h, 7h, 12h, 18h)
  const classStarts: Date[] = [];
  const now = new Date();
  const hours = [6, 7, 12, 18];
  for (let i = 0; i < 30; i++) {
    const daysBack = randomInt(1, 28);
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - daysBack);
    day.setUTCHours(0, 0, 0, 0);
    const h = pick(hours);
    const start = new Date(day);
    start.setUTCHours(h, 0, 0, 0);
    if (start <= now) classStarts.push(start);
  }
  const toCreate =
    classStarts.length >= 30 ? classStarts.slice(0, 30) : classStarts;
  while (toCreate.length < 30) {
    const daysBack = randomInt(1, 28);
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - daysBack);
    day.setUTCHours(0, 0, 0, 0);
    const start = new Date(day);
    start.setUTCHours(pick(hours), 0, 0, 0);
    if (start <= now) toCreate.push(start);
  }
  const classes: { id: string; startAt: Date; capacity: number }[] = [];
  for (const startAt of toCreate) {
    const endAt = addHours(startAt, 1);
    const capacity = randomInt(10, 20);
    const c = await prisma.class.create({
      data: {
        title: pick(CLASS_TITLES),
        startAt,
        endAt,
        capacity,
      },
    });
    classes.push({ id: c.id, startAt: c.startAt, capacity: c.capacity });
  }
  console.log("   Created 30 classes (last 4 weeks, capacity 10–20).");

  // 5) Create 300 attendance records (no duplicate user per class)
  const attendanceKeys = new Set<string>();
  const key = (cid: string, uid: string) => `${cid}:${uid}`;
  let totalAtt = 0;
  for (const c of classes) {
    const maxAtt = Math.min(c.capacity, randomInt(6, c.capacity));
    const shuffled = [...allMemberIds].sort(() => Math.random() - 0.5);
    const attendees = shuffled.slice(0, maxAtt);
    for (const userId of attendees) {
      if (totalAtt >= 300) break;
      attendanceKeys.add(key(c.id, userId));
      const offsetMin = randomInt(0, 45);
      const attendedAt = addHours(c.startAt, offsetMin / 60);
      await prisma.attendance.create({
        data: { userId, classId: c.id, attendedAt },
      });
      totalAtt++;
    }
    if (totalAtt >= 300) break;
  }
  while (totalAtt < 300) {
    const c = pick(classes);
    const userId = pick(allMemberIds);
    if (attendanceKeys.has(key(c.id, userId))) continue;
    attendanceKeys.add(key(c.id, userId));
    const offsetMin = randomInt(0, 55);
    const attendedAt = addHours(c.startAt, offsetMin / 60);
    await prisma.attendance.create({
      data: { userId, classId: c.id, attendedAt },
    });
    totalAtt++;
  }
  console.log("   Created 300 attendance records (last 4 weeks).");

  console.log(
    "✅ Seed concluído: 1 box (superforce), 15 users, 40 workouts, 30 classes, 300 attendances.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
